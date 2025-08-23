// src/lib/drizzle.ts
import { db } from "@/drizzle/db";
import * as schema from "@/drizzle/schema";

// Экспортируем объект db и схему для использования в приложении
export { db, schema };

// Функция для проверки соединения с базой данных
export async function checkDatabaseConnection() {
	try {
		// Выполняем простой запрос для проверки соединения
		await db.select({ count: schema.users.id }).from(schema.users).limit(1);
		return true;
	} catch (error) {
		console.error("Ошибка подключения к базе данных:", error);
		return false;
	}
}

// Вспомогательные функции для работы с Drizzle
// Пример: функция для пагинации
export function getPaginationParams(page: number | string, limit: number | string) {
	const pageNum = typeof page === "string" ? parseInt(page, 10) : page;
	const limitNum = typeof limit === "string" ? parseInt(limit, 10) : limit;

	const validPage = isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
	const validLimit = isNaN(limitNum) || limitNum < 1 ? 10 : limitNum;

	return {
		skip: (validPage - 1) * validLimit,
		take: validLimit,
		page: validPage,
		limit: validLimit,
	};
}

// Функция для преобразования параметров поиска в условия запроса
export function buildWhereConditions(params: Record<string, any>) {
	const conditions: Record<string, any> = {};

	// Здесь можно добавить логику для преобразования параметров поиска в условия запроса
	// Например, для поиска по имени, телефону и т.д.

	return conditions;
}

// Функция для обработки ошибок запросов к базе данных
export function handleDatabaseError(error: unknown) {
	console.error("Ошибка базы данных:", error);

	// Здесь можно добавить логику для обработки различных типов ошибок

	return {
		message: "Произошла ошибка при работе с базой данных",
		status: 500,
	};
}
