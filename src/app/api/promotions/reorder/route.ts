// src\app\api\promotions\reorder\route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/promotions/reorder
export async function POST(req: Request) {
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
