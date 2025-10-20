// src/app/api/products/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const query = searchParams.get("q") || "";
		const limit = parseInt(searchParams.get("limit") || "10");

		if (!query.trim()) {
			return NextResponse.json({ results: [] });
		}

		const searchQuery = query.toLowerCase();

		// Поиск товаров
		const products = await prisma.product.findMany({
			where: {
				OR: [
					{ title: { contains: searchQuery, mode: "insensitive" } },
					{ sku: { contains: searchQuery, mode: "insensitive" } },
					{ brand: { contains: searchQuery, mode: "insensitive" } },
				],
			},
			select: {
				id: true,
				title: true,
				sku: true,
				brand: true,
				category: {
					select: {
						title: true,
					},
				},
			},
			take: Math.min(limit, 5), // Максимум 5 товаров
		});

		// Поиск категорий
		const categories = await prisma.category.findMany({
			where: {
				title: { contains: searchQuery, mode: "insensitive" },
			},
			select: {
				id: true,
				title: true,
			},
			take: Math.min(limit, 5), // Максимум 5 категорий
		});

		// Формируем результаты
		const results = [
			...products.map((product) => ({
				type: "product",
				id: product.id,
				title: product.title,
				subtitle: `${product.brand} • ${product.sku}${product.category?.title ? ` • ${product.category.title}` : ""}`,
			})),
			...categories.map((category) => ({
				type: "category",
				id: category.id,
				title: category.title,
				subtitle: "Категория товаров",
			})),
		];

		// Сортируем результаты по релевантности
		results.sort((a, b) => {
			const aTitle = a.title.toLowerCase();
			const bTitle = b.title.toLowerCase();
			const queryLower = searchQuery.toLowerCase();

			// Точное совпадение в начале названия имеет приоритет
			const aStartsWith = aTitle.startsWith(queryLower);
			const bStartsWith = bTitle.startsWith(queryLower);

			if (aStartsWith && !bStartsWith) return -1;
			if (!aStartsWith && bStartsWith) return 1;

			// Затем по длине названия (короче = лучше)
			return aTitle.length - bTitle.length;
		});

		return NextResponse.json({
			results: results.slice(0, limit),
		});
	} catch (error) {
		console.error("Ошибка поиска:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
