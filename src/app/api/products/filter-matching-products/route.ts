// src\app\api\products\filter-matching-products\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { Prisma } from "@prisma/client";

// 👇 добавляем интерфейс
interface ExtendedRequestContext {
	user: {
		id: number;
		role: "superadmin" | "admin" | "manager";
		departmentId: number | null;
	};
	scope: string;
}

export const GET = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		const { searchParams } = new URL(req.url);

		const brand = searchParams.get("brand") || undefined;
		const categoryId = searchParams.get("categoryId") || undefined;
		const search = searchParams.get("search")?.toLowerCase();
		const onlyStale = searchParams.get("onlyStale") === "true";
		const withoutDepartment = searchParams.get("withoutDepartment") === "true";
		const departmentIdParam = searchParams.get("departmentId");

		const priceMin = parseFloat(searchParams.get("priceMin") || "0");
		const priceMax = parseFloat(searchParams.get("priceMax") || "10000000");

		const searchFilter: Prisma.ProductWhereInput[] = search ? [{ title: { contains: search } }, { sku: { contains: search } }, { brand: { contains: search } }] : [];

		const where: Prisma.ProductWhereInput = {
			...(brand && { brand }),
			...(categoryId && { categoryId: parseInt(categoryId) }),
			...(search && { OR: searchFilter }),
			...(onlyStale && {
				updatedAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
			}),
			price: { gte: priceMin, lte: priceMax },
		};

		if (user.role === "superadmin") {
			if (withoutDepartment) {
				where.departmentId = { equals: null as unknown as number }; // 👈 фикс
			} else if (departmentIdParam) {
				where.departmentId = parseInt(departmentIdParam, 10);
			}
		} else {
			where.departmentId = user.departmentId ?? -1;
		}

		const products = await prisma.product.findMany({
			where,
			select: { id: true },
		});

		return NextResponse.json({ ids: products.map((p) => p.id) });
	},
	"view_products",
	["superadmin", "admin", "manager"]
);
