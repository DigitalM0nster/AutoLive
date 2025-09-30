// src\app\api\promotions\[id]\route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { getUserFromRequest } from "@/middleware/permissionMiddleware";

type Params = { params: Promise<{ id: string }> };

// GET /api/promotions/:id
export async function GET(_: Request, { params }: Params) {
	const { id } = await params;
	const promo = await prisma.promotion.findUnique({
		where: { id: Number(id) },
	});
	if (!promo) return new NextResponse("Не найдено", { status: 404 });
	return NextResponse.json(promo);
}

// PUT /api/promotions/:id — только для superadmin
export async function PUT(req: NextRequest, { params }: Params) {
	const { id } = await params;
	const { user, error, status } = await getUserFromRequest(req);
	if (!user) return NextResponse.json({ error }, { status });
	if (user.role !== "superadmin") {
		return new NextResponse("Недостаточно прав", { status: 403 });
	}

	try {
		const body = await req.json();
		const updated = await prisma.promotion.update({
			where: { id: Number(id) },
			data: {
				title: body.title,
				description: body.description,
				image: body.imageUrl,
				buttonText: body.buttonText,
				buttonLink: body.buttonLink,
			},
		});
		return NextResponse.json(updated);
	} catch (err) {
		console.error("Ошибка при обновлении акции:", err);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}

// DELETE /api/promotions/:id — только для superadmin
export async function DELETE(req: NextRequest, { params }: Params) {
	const { id } = await params;
	const { user, error, status } = await getUserFromRequest(req);
	if (!user) return NextResponse.json({ error }, { status });
	if (user.role !== "superadmin") {
		return new NextResponse("Недостаточно прав", { status: 403 });
	}

	try {
		await prisma.promotion.delete({ where: { id: Number(id) } });
		return new NextResponse(null, { status: 204 });
	} catch (err) {
		console.error("Ошибка при удалении акции:", err);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
