// src/app/api/products/get-products-by-category/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const categoryId = searchParams.get("category");

		if (!categoryId) {
			return NextResponse.json({ error: "Нет параметра category" }, { status: 400 });
		}

		const category = await prisma.category.findUnique({
			where: { id: parseInt(categoryId) },
			include: {
				products: {
					include: {
						productFilterValues: {
							include: {
								filterValue: {
									include: { filter: true },
								},
							},
						},
					},
				},
			},
		});

		if (!category) {
			return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
		}

		return NextResponse.json({ category });
	} catch (err) {
		console.error("Ошибка получения категории с товарами:", err);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
