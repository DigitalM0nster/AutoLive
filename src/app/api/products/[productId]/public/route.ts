// src/app/api/products/[productId]/public/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Публичный API для получения товара без авторизации
export async function GET(req: NextRequest, context: { params: Promise<{ productId: string }> }) {
	try {
		const { productId } = await context.params;
		const id = parseInt(productId);

		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		// Получаем товар с полной информацией
		const product = await prisma.product.findUnique({
			where: { id },
			include: {
				department: { select: { id: true, name: true } },
				category: { select: { id: true, title: true } },
				productFilterValues: {
					include: {
						filterValue: {
							include: {
								filter: { select: { id: true, title: true, type: true } },
							},
						},
					},
				},
			},
		});

		if (!product) {
			return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
		}

		// Удаляем supplierPrice из товара
		const { supplierPrice, ...productWithoutSupplierPrice } = product;

		// Преобразуем фильтры в нужный формат
		const filters = product.productFilterValues.map((pfv) => ({
			title: pfv.filterValue.filter.title,
			type: pfv.filterValue.filter.type,
			selected_values: [
				{
					value: pfv.filterValue.value,
				},
			],
		}));

		// Группируем фильтры по названию
		const groupedFilters = filters.reduce((acc: any[], filter) => {
			const existingFilter = acc.find((f) => f.title === filter.title);
			if (existingFilter) {
				existingFilter.selected_values.push(...filter.selected_values);
			} else {
				acc.push(filter);
			}
			return acc;
		}, []);

		return NextResponse.json({
			product: {
				...productWithoutSupplierPrice,
				filters: groupedFilters,
			},
		});
	} catch (error) {
		console.error("Ошибка при получении публичного товара:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
