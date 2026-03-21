// PATCH — обновление ФИО клиента (телефон не меняем: это логин)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/requireClientSession";
import { withDbRetry } from "@/lib/utils";

const MAX = 255;

function trimToNull(v: unknown): string | null {
	if (v == null) return null;
	const s = String(v).trim();
	return s === "" ? null : s.slice(0, MAX);
}

export async function PATCH(req: NextRequest) {
	const session = await requireClientSession();
	if ("error" in session) {
		return NextResponse.json({ error: session.error }, { status: session.status });
	}

	try {
		const body = (await req.json()) as {
			first_name?: unknown;
			last_name?: unknown;
			middle_name?: unknown;
		};

		const first_name = trimToNull(body.first_name);
		const last_name = trimToNull(body.last_name);
		const middle_name = trimToNull(body.middle_name);

		await withDbRetry(() =>
			prisma.user.update({
				where: { id: session.userId },
				data: { first_name, last_name, middle_name },
			})
		);

		return NextResponse.json({
			success: true,
			first_name: first_name ?? "",
			last_name: last_name ?? "",
			middle_name: middle_name ?? "",
		});
	} catch (e) {
		console.error("profile PATCH:", e);
		return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
	}
}
