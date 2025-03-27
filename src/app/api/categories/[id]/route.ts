// src/app/api/categories/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: { id: string } };

// GET /api/categories/:id
export async function GET(_: Request, { params }: Params) {
	const category = await prisma.category.findUnique({
		where: { id: Number(params.id) },
	});
	if (!category) return new NextResponse("Не найдено", { status: 404 });
	return NextResponse.json(category);
}

// PUT /api/categories/:id
export async function PUT(req: Request, { params }: Params) {
	try {
		const body = await req.json();
		const updated = await prisma.category.update({
			where: { id: Number(params.id) },
			data: {
				title: body.title,
				description: body.description || "",
				image: body.image,
			},
		});
		return NextResponse.json(updated);
	} catch (error) {
		console.error("Ошибка при обновлении категории:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}

// DELETE /api/categories/:id
// DELETE /api/categories/:id
export async function DELETE(_: Request, { params }: Params) {
	try {
		const categoryId = Number(params.id);

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

		// 4. Отвязываем все товары от этой категории (обнуляем categoryId)
		await prisma.product.updateMany({
			where: { categoryId },
			data: { categoryId: null },
		});

		// 5. Удаляем саму категорию
		await prisma.category.delete({
			where: { id: categoryId },
		});

		return new NextResponse(null, { status: 204 });
	} catch (error) {
		console.error("Ошибка при удалении категории:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
