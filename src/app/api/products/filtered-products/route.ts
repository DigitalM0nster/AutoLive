// src\app\api\products\filtered-products\route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const where: any = {};

	if (searchParams.has("brand")) {
		where.brand = searchParams.get("brand")!;
	}

	if (searchParams.has("categoryId")) {
		where.categoryId = parseInt(searchParams.get("categoryId")!);
	}

	if (searchParams.has("search")) {
		const search = searchParams.get("search")!;
		where.OR = [{ title: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }];
	}

	if (searchParams.get("onlyStale") === "true") {
		const date = new Date();
		date.setDate(date.getDate() - 30);
		where.updatedAt = { lt: date };
	}

	if (searchParams.has("priceMin") || searchParams.has("priceMax")) {
		where.price = {
			gte: parseFloat(searchParams.get("priceMin") || "0"),
			lte: parseFloat(searchParams.get("priceMax") || "999999"),
		};
	}

	if (searchParams.has("departmentId")) {
		where.departmentId = parseInt(searchParams.get("departmentId")!);
	}

	if (searchParams.get("withoutDepartment") === "true") {
		where.departmentId = null;
	}

	const products = await prisma.product.findMany({
		where,
		select: { id: true },
	});

	const ids = products.map((p) => p.id);

	return NextResponse.json({ ids });
}
