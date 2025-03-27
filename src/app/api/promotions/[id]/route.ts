// src\app\api\promotions\[id]\route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: { id: string } };

// GET /api/promotions/:id
export async function GET(_: Request, { params }: Params) {
	const promo = await prisma.promotion.findUnique({
		where: { id: Number(params.id) },
	});
	if (!promo) return new NextResponse("Не найдено", { status: 404 });
	return NextResponse.json(promo);
}

// PUT /api/promotions/:id
export async function PUT(req: Request, { params }: Params) {
	try {
		const body = await req.json();
		const updated = await prisma.promotion.update({
			where: { id: Number(params.id) },
			data: {
				title: body.title,
				description: body.description,
				image: body.imageUrl,
				buttonText: body.buttonText,
				buttonLink: body.buttonLink,
			},
		});
		return NextResponse.json(updated);
	} catch (error) {
		console.error("Ошибка при обновлении акции:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}

// DELETE /api/promotions/:id
export async function DELETE(_: Request, { params }: Params) {
	try {
		await prisma.promotion.delete({
			where: { id: Number(params.id) },
		});
		return new NextResponse(null, { status: 204 });
	} catch (error) {
		console.error("Ошибка при удалении акции:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
