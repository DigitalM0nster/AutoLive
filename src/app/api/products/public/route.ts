// src/app/api/products/public/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "100");
		const search = searchParams.get("search") || "";
		const categoryId = searchParams.get("categoryId");

		// Базовые условия для поиска
		const where: any = {};

		// Поиск по названию, артикулу или бренду
		if (search) {
			where.OR = [
				{ title: { contains: search, mode: "insensitive" } },
				{ sku: { contains: search, mode: "insensitive" } },
				{ brand: { contains: search, mode: "insensitive" } },
				{ category: { title: { contains: search, mode: "insensitive" } } },
			];
		}

		// Фильтр по категории
		if (categoryId) {
			where.categoryId = parseInt(categoryId);
		}

		// Получаем товары с пагинацией
		const [products, total] = await Promise.all([
			prisma.product.findMany({
				where,
				include: {
					category: {
						select: {
							id: true,
							title: true,
						},
					},
					department: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				skip: (page - 1) * limit,
				take: limit,
				orderBy: {
					title: "asc",
				},
			}),
			prisma.product.count({ where }),
		]);

		// Удаляем supplierPrice из всех товаров
		const sanitizedProducts = products.map((product) => {
			const { supplierPrice, ...rest } = product;
			return {
				...rest,
				categoryTitle: product.category?.title || null,
			};
		});

		return NextResponse.json({
			products: sanitizedProducts,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Ошибка получения публичных товаров:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
