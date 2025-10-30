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

/**
 * Универсальный ретрай-обёртка для кратковременных ошибок БД (например, Prisma P1017: "Server has closed the connection")
 * @param fn Асинхронная функция с DB-запросами
 * @param attempts Кол-во попыток
 * @param baseDelayMs Базовая задержка (экспоненциально растёт)
 */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 300): Promise<T> {
	for (let i = 0; i < attempts; i++) {
		try {
			return await fn();
		} catch (err: any) {
			const code = err?.code || err?.meta?.code;
			const msg = String(err?.message || "");
			const isTransient = code === "P1017" || /Server has closed the connection/i.test(msg);
			if (!isTransient || i === attempts - 1) throw err;
			await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, i)));
		}
	}
	// недостижимый код, для тайпскрипта
	throw new Error("withDbRetry: unexpected fallthrough");
}
