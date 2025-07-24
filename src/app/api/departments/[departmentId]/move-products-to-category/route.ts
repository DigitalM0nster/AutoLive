// src\app\api\departments\[departmentId]\move-products-to-category\route.ts

import { db } from "@/drizzle/db";
import { products, departmentCategories } from "@/drizzle/schema";
import { withPermission } from "@/middleware/permissionMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

export const POST = withPermission(
	async (req: NextRequest) => {
		const url = req.nextUrl.pathname;
		const match = url.match(/\/departments\/(\d+)\/move-products-to-category/);
		const departmentId = match ? Number(match[1]) : NaN;
		if (isNaN(departmentId)) {
			return NextResponse.json({ error: "Некорректный ID отдела" }, { status: 400 });
		}
		const { sourceCategoryId, targetCategoryId } = await req.json();
		if (targetCategoryId == null) {
			return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
		}
		// Проверка, разрешена ли целевая категория
		if (targetCategoryId !== 0) {
			// Пропускаем проверку для 'Без категории'
			const isCategoryAllowedArr = await db
				.select()
				.from(departmentCategories)
				.where(and(eq(departmentCategories.departmentId, departmentId), eq(departmentCategories.categoryId, targetCategoryId)));
			if (isCategoryAllowedArr.length === 0) {
				return NextResponse.json({ error: "Категория недоступна для этого отдела" }, { status: 400 });
			}
		}
		try {
			// Считаем количество перемещаемых товаров
			const toMove = await db
				.select({ id: products.id })
				.from(products)
				.where(and(eq(products.departmentId, departmentId), sourceCategoryId == null ? isNull(products.categoryId) : eq(products.categoryId, sourceCategoryId)));
			const moved = toMove.length;
			// Обновляем продукты
			await db
				.update(products)
				.set({ categoryId: targetCategoryId === 0 ? null : targetCategoryId })
				.where(and(eq(products.departmentId, departmentId), sourceCategoryId == null ? isNull(products.categoryId) : eq(products.categoryId, sourceCategoryId)));
			return NextResponse.json({ success: true, moved });
		} catch (error) {
			console.error("Ошибка при перемещении товаров в категорию:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin", "admin"]
);
