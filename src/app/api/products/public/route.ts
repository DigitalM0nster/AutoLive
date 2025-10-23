// src/app/api/products/public/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
	const startTime = Date.now();
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

		const executionTime = Date.now() - startTime;
		console.log(`📊 API /products выполнен за ${executionTime}мс`);

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

		// Специальная обработка ошибок подключения к базе данных
		if (error instanceof Error) {
			if (error.message.includes("connection pool") || error.message.includes("P1017")) {
				console.error("Проблема с пулом соединений базы данных");
				return NextResponse.json(
					{
						error: "Временная проблема с подключением к базе данных. Попробуйте позже.",
					},
					{ status: 503 }
				); // 503 Service Unavailable
			}

			if (error.message.includes("timeout")) {
				console.error("Таймаут подключения к базе данных");
				return NextResponse.json(
					{
						error: "Превышено время ожидания подключения к базе данных.",
					},
					{ status: 504 }
				); // 504 Gateway Timeout
			}
		}

		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
