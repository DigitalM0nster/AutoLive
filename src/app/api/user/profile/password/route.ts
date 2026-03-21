// PATCH — смена пароля клиента (нужен текущий пароль)

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/requireClientSession";
import { withDbRetry } from "@/lib/utils";

const MIN_LEN = 8;
const MAX_LEN = 128;

export async function PATCH(req: NextRequest) {
	const session = await requireClientSession();
	if ("error" in session) {
		return NextResponse.json({ error: session.error }, { status: session.status });
	}

	try {
		const body = (await req.json()) as {
			current_password?: unknown;
			new_password?: unknown;
		};

		const current = typeof body.current_password === "string" ? body.current_password : "";
		const next = typeof body.new_password === "string" ? body.new_password : "";

		if (!current) {
			return NextResponse.json({ error: "Введите текущий пароль" }, { status: 400 });
		}
		if (next.length < MIN_LEN) {
			return NextResponse.json({ error: `Новый пароль не короче ${MIN_LEN} символов` }, { status: 400 });
		}
		if (next.length > MAX_LEN) {
			return NextResponse.json({ error: "Пароль слишком длинный" }, { status: 400 });
		}

		const user = await withDbRetry(() =>
			prisma.user.findUnique({
				where: { id: session.userId },
				select: { password: true },
			})
		);

		if (!user?.password) {
			return NextResponse.json({ error: "Невозможно сменить пароль для этого аккаунта" }, { status: 400 });
		}

		const ok = await bcrypt.compare(current, user.password);
		if (!ok) {
			return NextResponse.json({ error: "Текущий пароль указан неверно" }, { status: 400 });
		}

		const hashed = await bcrypt.hash(next, 10);
		await withDbRetry(() =>
			prisma.user.update({
				where: { id: session.userId },
				data: { password: hashed },
			})
		);

		return NextResponse.json({ success: true });
	} catch (e) {
		console.error("profile/password PATCH:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
