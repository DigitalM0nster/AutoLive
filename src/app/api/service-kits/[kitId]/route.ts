// src/app/api/service-kits/[kitId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
	params: Promise<{
		kitId: string;
	}>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
	try {
		const { kitId } = await params;
		const kitIdNumber = parseInt(kitId, 10);

		if (isNaN(kitIdNumber)) {
			return NextResponse.json({ error: "Неверный ID комплекта" }, { status: 400 });
		}

		// Получаем комплект ТО по ID
		const kit = await prisma.serviceKit.findUnique({
			where: { id: kitIdNumber },
			include: {
				kitItems: {
					include: {
						product: true,
						analogProduct: true,
					},
				},
			},
		});

		if (!kit) {
			return NextResponse.json({ error: "Комплект не найден" }, { status: 404 });
		}

		// Форматируем данные для фронтенда
		const formattedKit = {
			id: kit.id,
			name: kit.title,
			title: kit.title,
			description: kit.description || "",
			image: kit.image || "/images/no-image.png",
			price: kit.price || 0,
			parts: kit.kitItems.map((item) => ({
				name: item.product.title,
				analogs: item.analogProduct ? [item.analogProduct.title] : [],
			})),
		};

		return NextResponse.json(formattedKit);
	} catch (error) {
		console.error("Ошибка при получении комплекта ТО:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
