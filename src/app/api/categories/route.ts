// src/app/api/categories/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

// --- GET (оставим открытым, если категории видны клиентам) ---
export async function GET() {
	try {
		console.log("API: Начинаем получение категорий...");

		// Проверяем подключение к базе данных
		await prisma.$connect();
		console.log("API: Подключение к БД успешно");

		const categories = await prisma.category.findMany({
			orderBy: { order: "asc" },
			include: {
				products: {
					select: { id: true },
				},
			},
		});

		console.log(`API: Получено ${categories.length} категорий`);

		const result = categories.map((cat) => ({
			id: cat.id,
			title: cat.title,
			image: cat.image,
			productCount: cat.products.length,
		}));

		console.log("API: Формируем ответ:", JSON.stringify(result, null, 2));

		// Устанавливаем правильные заголовки для JSON
		return new NextResponse(JSON.stringify(result), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
			},
		});
	} catch (error) {
		console.error("API: Ошибка при получении категорий:", error);

		// Возвращаем JSON с ошибкой
		return new NextResponse(
			JSON.stringify({
				error: "Ошибка сервера",
				message: error instanceof Error ? error.message : "Неизвестная ошибка",
				timestamp: new Date().toISOString(),
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	} finally {
		// Закрываем подключение к базе данных
		await prisma.$disconnect();
		console.log("API: Подключение к БД закрыто");
	}
}

// --- POST (ТОЛЬКО для superadmin с edit_categories) ---
export const POST = withPermission(
	async (req) => {
		try {
			const body = await req.json();

			const category = await prisma.category.create({
				data: {
					title: body.title,
					image: body.image,
					order: 0,
				},
			});

			return NextResponse.json(category);
		} catch (error) {
			console.error("Ошибка при создании категории:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"edit_categories",
	["superadmin"]
);
