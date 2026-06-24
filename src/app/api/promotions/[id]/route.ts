// src\app\api\promotions\[id]\route.ts

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@/middleware/permissionMiddleware";
import { parseOptionalPromotionDate, validatePromotionDates } from "@/lib/promotionDates";
import { readPromotionButtonsFromBody, serializePromotionButtons, validatePromotionButtons } from "@/lib/promotionButtons";

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

		const updated = await prisma.promotion.update({
			where: { id: Number(id) },
			data: {
				title: body.title,
				description: body.description,
				image: body.imageUrl,
				buttonsJson: serializePromotionButtons(buttons),
				startDate,
				endDate,
			},
		});
		revalidatePath("/promotions", "layout");
		return NextResponse.json(updated);
	} catch (err) {
		console.error("Ошибка при обновлении акции:", err);

		if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2000") {
			return NextResponse.json(
				{ error: "Не удалось сохранить изображение: файл слишком большой для текущей схемы БД. Обновите миграции на сервере или загрузите изображение меньшего размера." },
				{ status: 400 },
			);
		}

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
		revalidatePath("/promotions", "layout");
		return new NextResponse(null, { status: 204 });
	} catch (err) {
		console.error("Ошибка при удалении акции:", err);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
