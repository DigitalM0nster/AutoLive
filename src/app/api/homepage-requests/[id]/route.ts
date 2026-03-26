export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";

async function getOneHandler(req: NextRequest, { params }: { user: unknown; scope: unknown; params: { id: string } }) {
	try {
		const id = parseInt(params.id, 10);
		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}
		const row = await withDbRetry(async () => prisma.homepageRequest.findUnique({ where: { id } }));
		if (!row) {
			return NextResponse.json({ error: "Не найдено" }, { status: 404 });
		}
		return NextResponse.json(row);
	} catch (e) {
		console.error("homepage-requests GET id:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

async function patchHandler(req: NextRequest, { params }: { user: unknown; scope: unknown; params: { id: string } }) {
	try {
		const id = parseInt(params.id, 10);
		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		const body = await req.json();
		const status = body?.status;
		if (status !== "new" && status !== "processed") {
			return NextResponse.json({ error: "Укажите status: new или processed" }, { status: 400 });
		}

		const updated = await withDbRetry(async () =>
			prisma.homepageRequest.update({
				where: { id },
				data: { status },
			}),
		);

		return NextResponse.json(updated);
	} catch (e: unknown) {
		const code = (e as { code?: string })?.code;
		if (code === "P2025") {
			return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
		}
		console.error("homepage-requests PATCH:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

export const GET = withPermission(getOneHandler, "view_orders", ["superadmin", "admin", "manager"]);

export const PATCH = withPermission(patchHandler, "manage_orders", ["superadmin", "admin", "manager"]);
