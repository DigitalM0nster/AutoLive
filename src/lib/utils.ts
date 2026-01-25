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
 * Универсальный ретрай-обёртка для кратковременных ошибок БД
 * Обрабатывает различные типы ошибок соединения с базой данных
 * Оптимизировано для работы с медленным соединением Neon
 * @param fn Асинхронная функция с DB-запросами
 * @param attempts Кол-во попыток (увеличено для Neon)
 * @param baseDelayMs Базовая задержка (экспоненциально растёт, увеличена для Neon)
 */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 5, baseDelayMs = 500): Promise<T> {
	for (let i = 0; i < attempts; i++) {
		try {
			return await fn();
		} catch (err: any) {
			const code = err?.code || err?.meta?.code || "";
			const msg = String(err?.message || "").toLowerCase();

			// Расширенный список кодов ошибок Prisma, связанных с соединением
			// P2024 - Timed out fetching a new connection from the connection pool
			const connectionErrorCodes = ["P1017", "P1001", "P1008", "P1013", "P2024"];

			// Расширенный список текстовых признаков ошибок соединения
			const connectionErrorMessages = [
				"server has closed the connection",
				"connection reset",
				"connection refused",
				"can't reach database",
				"operations timed out",
				"удаленный хост принудительно разорвал",
				"connection terminated",
				"broken pipe",
				"timed out fetching a new connection", // Ошибка таймаута пула соединений
				"connection pool", // Ошибки связанные с пулом соединений
			];

			// Проверяем, является ли это ошибкой соединения
			const isTransient = connectionErrorCodes.includes(code) || connectionErrorMessages.some((errorMsg) => msg.includes(errorMsg));

			// Если это не ошибка соединения или это последняя попытка - пробрасываем ошибку
			if (!isTransient || i === attempts - 1) {
				throw err;
			}

			// Для ошибки P2024 (таймаут пула соединений) используем большую задержку
			// Это даёт время освободить соединения в пуле
			const isPoolTimeout = code === "P2024";
			const actualBaseDelay = isPoolTimeout ? 2000 : baseDelayMs; // Для P2024 начинаем с 2 секунд
			const delay = actualBaseDelay * Math.pow(2, i); // Экспоненциальная задержка

			// Ждём перед следующей попыткой
			await new Promise((r) => setTimeout(r, delay));
		}
	}
	// недостижимый код, для тайпскрипта
	throw new Error("withDbRetry: unexpected fallthrough");
}
