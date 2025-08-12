// src/lib/utils.ts

/**
 * Форматирует дату в удобный для чтения формат
 * @param date Объект даты для форматирования
 * @returns Строка с отформатированной датой
 */
export function formatDate(date: Date): string {
	const day = date.getDate().toString().padStart(2, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const year = date.getFullYear();
	const hours = date.getHours().toString().padStart(2, "0");
	const minutes = date.getMinutes().toString().padStart(2, "0");

	return `${day}.${month}.${year} ${hours}:${minutes}`;
}
