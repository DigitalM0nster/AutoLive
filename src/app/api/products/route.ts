// src/app/api/products/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);

	const sortBy = searchParams.get("sortBy") || "createdAt";
	const order = searchParams.get("order") === "asc" ? "asc" : "desc";
	const onlyStale = searchParams.get("onlyStale") === "true";

	const page = parseInt(searchParams.get("page") || "1");
	const limit = parseInt(searchParams.get("limit") || "10");
	const brand = searchParams.get("brand") || undefined;
	const categoryId = searchParams.get("categoryId") || undefined;
	const search = searchParams.get("search")?.toLowerCase();

	const where: Prisma.ProductWhereInput = {
		...(brand && { brand }),
		...(categoryId && { categoryId: parseInt(categoryId) }),
		...(search && {
			OR: [{ title: { contains: search } }, { sku: { contains: search } }, { brand: { contains: search } }],
		}),
		...(onlyStale && {
			updatedAt: {
				lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 дней
			},
		}),
	};

	const orderBy: Prisma.ProductOrderByWithRelationInput = sortBy === "categoryTitle" ? { category: { title: order } } : { [sortBy]: order };

	try {
		const [products, total] = await Promise.all([
			prisma.product.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				include: {
					category: true,
				},
				orderBy,
			}),
			prisma.product.count({ where }),
		]);

		return NextResponse.json({
			products: products.map((p) => ({
				id: p.id,
				sku: p.sku,
				title: p.title,
				description: p.description,
				price: p.price,
				brand: p.brand,
				image: p.image,
				categoryId: p.categoryId,
				categoryTitle: p.category?.title || "—",
				updatedAt: p.updatedAt.toISOString(),
			})),

			total,
			totalPages: Math.ceil(total / limit),
			page,
		});
	} catch (error) {
		console.error("Ошибка получения товаров:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}

// POST – Создание нового товара
export async function POST(req: Request) {
	const body = await req.json();

	// Простая ручная валидация
	if (
		typeof body.title !== "string" ||
		body.title.trim() === "" ||
		typeof body.sku !== "string" ||
		body.sku.trim() === "" ||
		typeof body.brand !== "string" ||
		body.brand.trim() === "" ||
		typeof body.price !== "number" ||
		isNaN(body.price)
	) {
		return NextResponse.json({ error: "Обязательные поля: title, sku, brand, price" }, { status: 400 });
	}

	try {
		const product = await prisma.product.create({
			data: {
				title: body.title,
				description: body.description,
				sku: body.sku,
				price: body.price,
				brand: body.brand,
				categoryId: body.categoryId,
				image: body.image,
			},
		});
		return NextResponse.json({ product });
	} catch (error) {
		console.error("Ошибка создания продукта:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
