import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
	try {
		// Получаем минимальные и максимальные цены поставщика
		const supplierPriceStats = await prisma.product.aggregate({
			_min: {
				supplierPrice: true,
			},
			_max: {
				supplierPrice: true,
			},
			where: {
				supplierPrice: {
					not: null,
				},
			},
		});

		// Получаем минимальные и максимальные цены на сайте
		const sitePriceStats = await prisma.product.aggregate({
			_min: {
				price: true,
			},
			_max: {
				price: true,
			},
		});

		// Обрабатываем результаты
		const supplierPriceMin = supplierPriceStats._min.supplierPrice || 0;
		const supplierPriceMax = supplierPriceStats._max.supplierPrice || 100000;
		const sitePriceMin = sitePriceStats._min.price || 0;
		const sitePriceMax = sitePriceStats._max.price || 100000;

		return NextResponse.json({
			success: true,
			supplierPrice: {
				min: supplierPriceMin,
				max: supplierPriceMax,
			},
			sitePrice: {
				min: sitePriceMin,
				max: sitePriceMax,
			},
		});
	} catch (error) {
		console.error("Ошибка получения границ цен:", error);
		return NextResponse.json({ success: false, error: "Ошибка получения границ цен" }, { status: 500 });
	}
}
