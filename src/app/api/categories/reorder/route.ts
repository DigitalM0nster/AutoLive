// src/app/api/categories/reorder/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
	try {
		// Получаем данные из запроса
		// ids - массив ID категорий в новом порядке
		// orders - массив объектов с id и новым порядком для каждой категории
		const { ids, orders } = await request.json();

		// Проверяем корректность данных
		if (!ids || !orders || !Array.isArray(ids) || !Array.isArray(orders)) {
			return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
		}

		// Обновляем порядок всех категорий в базе данных
		// Используем Promise.all для параллельного выполнения всех обновлений
		// Это значительно быстрее, чем последовательное обновление
		const updatePromises = orders.map(({ id, order }) =>
			prisma.category.update({
				where: { id: Number(id) }, // ID категории для поиска
				data: { order: Number(order) }, // Новый порядок для этой категории
			})
		);

		// Ждем завершения всех обновлений
		await Promise.all(updatePromises);

		// Возвращаем успешный ответ
		return NextResponse.json({ message: "Порядок категорий обновлен" });
	} catch (error) {
		console.error("Ошибка при изменении порядка категорий:", error);
		return NextResponse.json({ error: "Ошибка при изменении порядка категорий" }, { status: 500 });
	}
}
