// src/app/api/service-kits/product-analogs/route.ts
// API endpoint для получения аналогов товара из ProductAnalog
// Используется для автоматического подтягивания аналогов при создании/редактировании элемента комплекта

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";

async function getProductAnalogsHandler(req: NextRequest, { user }: { user: any }) {
	try {
		const { searchParams } = new URL(req.url);
		const productId = searchParams.get("productId");

		if (!productId) {
			return NextResponse.json({ error: "ID товара обязателен" }, { status: 400 });
		}

		const productIdNumber = parseInt(productId, 10);

		if (isNaN(productIdNumber)) {
			return NextResponse.json({ error: "Неверный ID товара" }, { status: 400 });
		}

		// Получаем все аналоги товара из таблицы ProductAnalog
		const analogs = await prisma.productAnalog.findMany({
			where: {
				productId: productIdNumber,
			},
			include: {
				analog: {
					select: {
						id: true,
						title: true,
						sku: true,
						brand: true,
						price: true,
						image: true,
					},
				},
			},
		});

		// Форматируем данные для фронтенда
		const formattedAnalogs = analogs.map((analog) => analog.analog);

		return NextResponse.json(formattedAnalogs);
	} catch (error) {
		console.error("Ошибка при получении аналогов товара:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

export const GET = withPermission(getProductAnalogsHandler, "view_products", ["superadmin", "admin", "manager"]);
