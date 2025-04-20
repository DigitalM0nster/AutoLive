import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl;

		const where: any = {};

		// 🎯 Фильтры из query
		if (searchParams.get("search")) {
			const search = searchParams.get("search")!;
			where.OR = [
				{ title: { contains: search, mode: "insensitive" } },
				{ sku: { contains: search, mode: "insensitive" } },
				{ brand: { contains: search, mode: "insensitive" } },
			];
		}

		if (searchParams.get("categoryId") && searchParams.get("categoryId") !== "") {
			if (searchParams.get("categoryId") === "__none__") {
				where.categoryId = null;
			} else {
				where.categoryId = Number(searchParams.get("categoryId"));
			}
		}

		if (searchParams.get("departmentId")) {
			where.departmentId = Number(searchParams.get("departmentId"));
		}

		if (searchParams.get("brand")) {
			where.brand = searchParams.get("brand");
		}

		if (searchParams.get("onlyStale") === "true") {
			where.isStale = true;
		}

		const min = await prisma.product.aggregate({
			where,
			_min: { price: true },
		});
		const max = await prisma.product.aggregate({
			where,
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
