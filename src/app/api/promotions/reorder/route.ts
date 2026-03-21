// src\app\api\promotions\reorder\route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { getUserFromRequest } from "@/middleware/permissionMiddleware";

// POST /api/promotions/reorder — порядок карточек акций (только суперадмин, как PUT/DELETE акций)
export async function POST(req: NextRequest) {
	const { user, error, status } = await getUserFromRequest(req);
	if (!user) return NextResponse.json({ error }, { status });
	if (user.role !== "superadmin") {
		return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
	}

	try {
		const body = await req.json(); // [{ id, order }, ...]
		await Promise.all(
			body.map((item: { id: number; order: number }) =>
				prisma.promotion.update({
					where: { id: item.id },
					data: { order: item.order },
				})
			)
		);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Ошибка при сохранении порядка акций:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
