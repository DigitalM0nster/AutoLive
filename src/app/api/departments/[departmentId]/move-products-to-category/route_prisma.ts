// src\app\api\departments\[departmentId]\move-products-to-category\route.ts

import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { NextRequest, NextResponse } from "next/server";

export const POST = withPermission(
	async (req: NextRequest) => {
		const url = req.nextUrl.pathname;
		const match = url.match(/\/departments\/(\d+)\/move-products-to-category/);
		const departmentId = match ? Number(match[1]) : NaN;

		if (isNaN(departmentId)) {
			return NextResponse.json({ error: "Некорректный ID отдела" }, { status: 400 });
		}

		const { sourceCategoryId, targetCategoryId } = await req.json();

		if (!sourceCategoryId || !targetCategoryId || sourceCategoryId === targetCategoryId) {
			return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
		}

		// ✅ проверка, разрешена ли целевая категория
		const isCategoryAllowed = await prisma.departmentCategory.findFirst({
			where: {
				departmentId,
				categoryId: targetCategoryId,
			},
		});

		if (!isCategoryAllowed) {
			return NextResponse.json({ error: "Категория недоступна для этого отдела" }, { status: 400 });
		}

		try {
			const updated = await prisma.product.updateMany({
				where: {
					departmentId,
					categoryId: sourceCategoryId,
				},
				data: {
					categoryId: targetCategoryId,
				},
			});

			return NextResponse.json({ success: true, moved: updated.count });
		} catch (error) {
			console.error("Ошибка при перемещении товаров в категорию:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin", "admin"]
);
