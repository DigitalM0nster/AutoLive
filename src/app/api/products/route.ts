// src/app/api/products/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);

	const page = parseInt(searchParams.get("page") || "1");
	const limit = parseInt(searchParams.get("limit") || "10");
	const brand = searchParams.get("brand") || undefined;
	const categoryId = searchParams.get("categoryId") || undefined;

	const where: any = {};
	if (brand) where.brand = brand;
	if (categoryId) where.categoryId = parseInt(categoryId);

	try {
		const [products, total] = await Promise.all([
			prisma.product.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				include: {
					category: true, // получаем название категории
				},
				orderBy: {
					createdAt: "desc",
				},
			}),
			prisma.product.count({ where }),
		]);

		return NextResponse.json({
			products: products.map((p) => ({
				id: p.id,
				sku: p.sku,
				title: p.title,
				price: p.price,
				brand: p.brand,
				categoryTitle: p.category?.title || "—",
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
