// src\app\api\products\price-range\route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		const min = await prisma.product.aggregate({
			_min: { price: true },
		});
		const max = await prisma.product.aggregate({
			_max: { price: true },
		});

		return NextResponse.json({
			minPrice: min._min.price ?? 0,
			maxPrice: max._max.price ?? 0,
		});
	} catch (error) {
		console.error("Ошибка при получении диапазона цен:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
