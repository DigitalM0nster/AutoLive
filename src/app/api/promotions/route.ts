// src\app\api\promotions\route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { getUserFromRequest } from "@/middleware/permissionMiddleware";

// GET /api/promotions
export async function GET() {
	const promos = await prisma.promotion.findMany({
		orderBy: { order: "asc" },
	});
	return NextResponse.json(promos);
}

// POST /api/promotions — только для superadmin
export async function POST(req: NextRequest) {
	const { user, error, status } = await getUserFromRequest(req);
	if (!user) return NextResponse.json({ error }, { status });
	if (user.role !== "superadmin") {
		return new NextResponse("Недостаточно прав", { status: 403 });
	}

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
	} catch (err) {
		console.error("Ошибка при создании акции:", err);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
