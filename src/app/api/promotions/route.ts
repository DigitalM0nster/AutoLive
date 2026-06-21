// src\app\api\promotions\route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { getUserFromRequest } from "@/middleware/permissionMiddleware";
import { parseOptionalPromotionDate, validatePromotionDates } from "@/lib/promotionDates";
import { readPromotionButtonsFromBody, serializePromotionButtons, validatePromotionButtons } from "@/lib/promotionButtons";

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
	// Раздел «Контент» в админке доступен только суперадмину — создание акций тем же правилом
	if (user.role !== "superadmin") {
		return NextResponse.json({ error: "Недостаточно прав (нужна роль суперадмин)" }, { status: 403 });
	}

	try {
		const body = await req.json();
		const title = String(body.title || "").trim();
		if (!title) {
			return NextResponse.json({ error: "Укажите название акции" }, { status: 400 });
		}

		const maxOrder = await prisma.promotion.aggregate({ _max: { order: true } });
		const startDate = parseOptionalPromotionDate(body.startDate);
		const endDate = parseOptionalPromotionDate(body.endDate);
		const datesValidationError = validatePromotionDates(startDate, endDate);
		if (datesValidationError) {
			return NextResponse.json({ error: datesValidationError }, { status: 400 });
		}

		const buttons = readPromotionButtonsFromBody(body);
		const buttonsError = validatePromotionButtons(buttons);
		if (buttonsError) {
			return NextResponse.json({ error: buttonsError }, { status: 400 });
		}

		const created = await prisma.promotion.create({
			data: {
				title,
				description: body.description ? String(body.description).trim() : null,
				image: body.imageUrl ? String(body.imageUrl).trim() : null,
				buttonsJson: serializePromotionButtons(buttons),
				order: (maxOrder._max.order ?? 0) + 1,
				startDate,
				endDate,
			},
		});
		return NextResponse.json(created);
	} catch (err) {
		console.error("Ошибка при создании акции:", err);
		return NextResponse.json({ error: "Ошибка сервера при создании акции" }, { status: 500 });
	}
}
