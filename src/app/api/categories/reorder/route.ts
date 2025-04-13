// src/app/api/categories/reorder/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

// reorder доступен только superadmin
export const POST = withPermission(
	async (req) => {
		try {
			const { ids } = await req.json(); // массив id в новом порядке
			if (!Array.isArray(ids)) return new NextResponse("Неверный формат", { status: 400 });

			await Promise.all(
				ids.map((id, index) =>
					prisma.category.update({
						where: { id: Number(id) },
						data: { order: index },
					})
				)
			);

			return new NextResponse(null, { status: 204 });
		} catch (error) {
			console.error("Ошибка reorder категорий:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"edit_categories",
	["superadmin"]
);
