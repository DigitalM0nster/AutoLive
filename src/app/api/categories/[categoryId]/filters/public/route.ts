// src/app/api/categories/[categoryId]/filters/public/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, context: { params: Promise<{ categoryId: string }> }) {
	try {
		const { categoryId } = await context.params;
		const id = parseInt(categoryId);

		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID категории" }, { status: 400 });
		}

		// Получаем фильтры категории с их значениями (публичный API)
		const filters = await prisma.filter.findMany({
			where: { categoryId: id },
			include: {
				values: {
					orderBy: { value: "asc" },
				},
			},
			orderBy: { id: "asc" },
		});

		// Форматируем данные в нужный формат
		const formattedFilters = filters.map((filter) => ({
			id: filter.id,
			title: filter.title,
			type: filter.type,
			unit: filter.unit, // Добавляем единицу измерения
			values: filter.values.map((value) => ({
				id: value.id,
				value: value.value,
			})),
		}));

		return NextResponse.json(formattedFilters);
	} catch (error) {
		console.error("Ошибка при получении публичных фильтров категории:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
