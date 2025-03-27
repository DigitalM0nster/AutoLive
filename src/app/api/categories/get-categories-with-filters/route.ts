// src/app/api/categories/get-categories-with-filters/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		const categories = await prisma.category.findMany({
			include: {
				Filter: {
					include: {
						values: true, // подтягиваем значения фильтров
					},
				},
			},
			orderBy: {
				id: "asc",
			},
		});

		return NextResponse.json(categories);
	} catch (error) {
		console.error("Ошибка загрузки категорий с фильтрами:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
