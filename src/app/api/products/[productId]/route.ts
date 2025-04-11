// src/app/api/products/[productId]/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET – Получение товара по ID
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

		const filtersMap: Record<number, { id: number; title: string; selected_values: { id: number; value: string }[] }> = {};

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
			sku: product.sku,
			title: product.title,
			description: product.description,
			price: product.price,
			image: product.image,
			brand: product.brand,
			category: product.category,
			filters: Object.values(filtersMap),
		};

		return NextResponse.json({ product: structuredProduct });
	} catch (error) {
		console.error("❌ Ошибка получения продукта:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// PUT – Редактирование товара по ID
export async function PUT(req: NextRequest, context: { params: { productId: string } }) {
	const { productId } = context.params;
	const body = await req.json();

	try {
		const id = parseInt(productId);
		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		const product = await prisma.product.update({
			where: { id },
			data: {
				sku: body.sku,
				title: body.title,
				description: body.description,
				price: body.price,
				brand: body.brand,
				categoryId: body.categoryId,
				image: body.image,
			},
		});
		return NextResponse.json({ product });
	} catch (error) {
		console.error("Ошибка обновления продукта:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// DELETE – Удаление товара по ID
export async function DELETE(req: Request, context: { params: { productId: string } }) {
	const { productId } = context.params;

	try {
		const id = parseInt(productId);
		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		const existing = await prisma.product.findUnique({ where: { id } });
		if (!existing) {
			return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
		}

		await prisma.product.delete({ where: { id } });
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Ошибка удаления продукта:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
