// src\app\api\departments\[departmentId]\products-by-category\route.ts

import { db } from "@/drizzle/db";
import { products } from "@/drizzle/schema";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { eq } from "drizzle-orm";

export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/")[3]);
		if (isNaN(departmentId)) return NextResponse.json({ error: "Неверный ID" }, { status: 400 });

		// Получаем все товары отдела
		const allProducts = await db.select({ categoryId: products.categoryId }).from(products).where(eq(products.departmentId, departmentId));

		// Группируем по categoryId и считаем количество
		const counts: Record<number, number> = {};
		for (const p of allProducts) {
			const key = p.categoryId ?? 0;
			counts[key] = (counts[key] || 0) + 1;
		}

		return NextResponse.json(counts);
	},
	"view_products",
	["superadmin", "admin", "manager"]
);
