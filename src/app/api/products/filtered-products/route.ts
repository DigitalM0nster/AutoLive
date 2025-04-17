import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const where: any = {};

	if (searchParams.has("brand")) {
		where.brand = searchParams.get("brand")!;
	}

	if (searchParams.has("categoryId")) {
		const categoryId = parseInt(searchParams.get("categoryId")!, 10);
		if (!isNaN(categoryId)) {
			where.categoryId = categoryId;
		}
	}

	if (searchParams.has("search")) {
		const search = searchParams.get("search")!;
		where.OR = [{ title: { contains: search } }, { sku: { contains: search } }];
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
		const departmentId = parseInt(searchParams.get("departmentId")!, 10);
		if (!isNaN(departmentId)) {
			where.departmentId = departmentId;
		}
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
