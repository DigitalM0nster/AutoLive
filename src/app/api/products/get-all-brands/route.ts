// src/app/api/products/get-all-brands/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const brands = await prisma.product.findMany({
			distinct: ["brand"],
			select: {
				brand: true,
			},
			orderBy: {
				brand: "asc",
			},
		});

		return NextResponse.json(brands.map((b) => b.brand));
	} catch (error) {
		console.error("Ошибка при получении брендов:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
