// src/app/api/products/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/products
export async function GET() {
	const products = await prisma.product.findMany();
	return NextResponse.json(products);
}

// POST /api/products
export async function POST(req: Request) {
	try {
		const body = await req.json();

		const product = await prisma.product.create({
			data: {
				title: body.title,
				description: body.description,
				price: body.price,
				image: body.image,
				sku: body.sku,
				category: {
					connect: { id: body.categoryId },
				},
			},
		});

		return NextResponse.json(product);
	} catch (error) {
		console.error("Ошибка при создании продукта:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
