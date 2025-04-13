// src/app/api/categories/[id]/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

type Params = { params: { id: string } };

// --- GET: можно оставить открытым ---
export async function GET(_: Request, { params }: Params) {
	const category = await prisma.category.findUnique({
		where: { id: Number(params.id) },
	});
	if (!category) return new NextResponse("Не найдено", { status: 404 });
	return NextResponse.json(category);
}

// --- PUT: только для superadmin с edit_categories ---
export const PUT = withPermission(
	async (req, { user }) => {
		try {
			const url = new URL(req.url);
			const id = Number(url.pathname.split("/").pop());
			const body = await req.json();

			const updated = await prisma.category.update({
				where: { id },
				data: {
					title: body.title,
					image: body.image,
				},
			});
			return NextResponse.json(updated);
		} catch (error) {
			console.error("Ошибка при обновлении категории:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"edit_categories",
	["superadmin"]
);

// --- DELETE: только для superadmin с edit_categories ---
export const DELETE = withPermission(
	async (req) => {
		try {
			const url = new URL(req.url);
			const categoryId = Number(url.pathname.split("/").pop());

			// 1. Удаляем все значения фильтров товаров этой категории
			await prisma.productFilterValue.deleteMany({
				where: {
					filterValue: {
						filter: {
							categoryId,
						},
					},
				},
			});

			// 2. Удаляем все значения фильтров этой категории
			await prisma.filterValue.deleteMany({
				where: {
					filter: {
						categoryId,
					},
				},
			});

			// 3. Удаляем все фильтры этой категории
			await prisma.filter.deleteMany({
				where: {
					categoryId,
				},
			});

			// 4. Отвязываем все товары от этой категории
			await prisma.product.updateMany({
				where: { categoryId },
				data: { categoryId: null },
			});

			// 5. Удаляем категорию
			await prisma.category.delete({
				where: { id: categoryId },
			});

			return new NextResponse(null, { status: 204 });
		} catch (error) {
			console.error("Ошибка при удалении категории:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"edit_categories",
	["superadmin"]
);
