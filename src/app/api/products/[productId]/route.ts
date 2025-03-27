// src/app/api/products/[productId]/get-product/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, context: { params: { productId: string } }) {
	const { productId } = context.params;

	console.log("🔍 Получаем товар по ID:", productId);

	try {
		const id = parseInt(productId);
		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		const product = await prisma.product.findUnique({
			where: { id },
			include: {
				category: {
					select: { id: true, title: true },
				},
				productFilterValues: {
					include: {
						filterValue: {
							include: {
								filter: true,
							},
						},
					},
				},
			},
		});

		if (!product) {
			return NextResponse.json({ error: "Продукт не найден" }, { status: 404 });
		}

		// Преобразуем фильтры в удобную структуру
		const filtersMap: Record<number, { id: number, title: string, selected_values: { id: number, value: string }[] }> = {};

		for (const pfv of product.productFilterValues) {
			const filter = pfv.filterValue.filter;
			if (!filtersMap[filter.id]) {
				filtersMap[filter.id] = {
					id: filter.id,
					title: filter.title,
					selected_values: [],
				};
			}
			filtersMap[filter.id].selected_values.push({
				id: pfv.filterValue.id,
				value: pfv.filterValue.value,
			});
		}

		const structuredProduct = {
			id: product.id,
			title: product.title,
			price: product.price,
			image: product.image,
			category: product.category,
			filters: Object.values(filtersMap),
		};

		return NextResponse.json({ product: structuredProduct });
	} catch (error) {
		console.error("❌ Ошибка получения продукта:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
