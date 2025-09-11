// src/app/api/categories/[categoryId]/filters/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest, context: { params: Promise<{ categoryId: string }> }) {
	try {
		const { categoryId } = await context.params;
		const id = parseInt(categoryId);

		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID категории" }, { status: 400 });
		}

		// Проверяем авторизацию
		const token = req.cookies.get("authToken")?.value;
		if (!token) {
			return NextResponse.json({ error: "Нет токена авторизации" }, { status: 401 });
		}

		let user: any;
		try {
			user = jwt.verify(token, process.env.JWT_SECRET!);
		} catch (e) {
			return NextResponse.json({ error: "Невалидный токен" }, { status: 401 });
		}

		if (!["superadmin", "admin", "manager"].includes(user.role)) {
			return NextResponse.json({ error: "Недостаточно прав для просмотра фильтров" }, { status: 403 });
		}

		// Получаем фильтры категории с их значениями
		const filters = await prisma.filter.findMany({
			where: { categoryId: id },
			include: {
				values: {
					orderBy: { value: "asc" },
				},
			},
			orderBy: { id: "asc" },
		});

		// Форматируем данные в нужный формат
		const formattedFilters = filters.map((filter) => ({
			id: filter.id,
			title: filter.title,
			type: filter.type,
			values: filter.values.map((value) => ({
				id: value.id,
				value: value.value,
			})),
		}));

		return NextResponse.json(formattedFilters);
	} catch (error) {
		console.error("Ошибка при получении фильтров категории:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
