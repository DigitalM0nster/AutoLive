// src\app\api\promotions\route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/promotions
export async function GET() {
	const promos = await prisma.promotion.findMany({
		orderBy: { order: "asc" }, // 👈 сортировка по порядку прямо в базе
	});
	return NextResponse.json(promos);
}

// POST /api/promotions
export async function POST(req: Request) {
	try {
		const body = await req.json();
		const created = await prisma.promotion.create({
			data: {
				title: body.title,
				description: body.description,
				image: body.imageUrl,
				buttonText: body.buttonText,
				buttonLink: body.buttonLink,
				order: 0,
			},
		});
		return NextResponse.json(created);
	} catch (error) {
		console.error("Ошибка при создании акции:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
