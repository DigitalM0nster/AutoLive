// src\lib\prisma.ts
import { PrismaClient } from "@prisma/client";

// Глобальная переменная для хранения экземпляра Prisma Client
// Это нужно для предотвращения создания множественных подключений в development режиме
const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

// Функция для проверки, является ли ошибка ошибкой разорванного соединения
// Это нужно для автоматического переподключения при проблемах с БД
function isConnectionError(error: any): boolean {
	if (!error) return false;

	const code = error?.code || error?.meta?.code || "";
	const message = String(error?.message || "").toLowerCase();
	const errorString = String(error || "").toLowerCase();

	// Коды ошибок Prisma, связанные с соединением:
	// P1017 - Server has closed the connection
	// P1001 - Can't reach database server
	// P1008 - Operations timed out
	// P1013 - The provided database string is invalid
	// P2024 - Timed out fetching a new connection from the connection pool (НЕ обрабатываем в middleware)
	const connectionErrorCodes = ["P1017", "P1001", "P1008", "P1013"];

	// Текстовые признаки ошибок соединения
	const connectionErrorMessages = [
		"server has closed the connection",
		"connection reset",
		"connection refused",
		"can't reach database",
		"operations timed out",
		"удаленный хост принудительно разорвал",
		"connection terminated",
		"broken pipe",
		"invalid", // Ошибки типа "Invalid `prisma.order.findUnique()` invocation"
		"server has closed",
		"timed out fetching a new connection", // Ошибка таймаута пула соединений
		"connection pool", // Ошибки связанные с пулом соединений
	];

	// Проверяем код ошибки
	if (connectionErrorCodes.includes(code)) {
		return true;
	}

	// Проверяем сообщение об ошибке и строковое представление ошибки
	const fullErrorText = message + " " + errorString;
	return connectionErrorMessages.some((msg) => fullErrorText.includes(msg));
}

// Создаем экземпляр Prisma Client с базовыми настройками
// Используем простую конфигурацию без дополнительных параметров в URL
// Это гарантирует стабильную работу
export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		// Отключаем логирование ошибок, чтобы не засорять консоль
		// Ошибки всё равно обрабатываются через middleware и withDbRetry
		log: [],
		errorFormat: "pretty",
	});

// Добавляем упрощённый middleware для обработки только ошибки P1017 (разрыв соединения)
// НЕ обрабатываем P2024 (таймаут пула), чтобы не создавать каскадные проблемы
// Middleware добавляется только один раз, чтобы избежать дублирования
const globalForMiddleware = globalThis as unknown as {
	prismaMiddlewareAdded: boolean | undefined;
};

if (!globalForMiddleware.prismaMiddlewareAdded) {
	globalForMiddleware.prismaMiddlewareAdded = true;

	prisma.$use(async (params, next) => {
		// Делаем до 2 попыток повтора (всего 3 запроса) для надёжности
		// Если соединение разорвано, делаем несколько быстрых попыток
		const maxRetries = 2;
		let lastError: any;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await next(params);
			} catch (error: any) {
				lastError = error;
				const errorCode = error?.code || error?.meta?.code || "";
				const message = String(error?.message || "").toLowerCase();

				// Обрабатываем ТОЛЬКО ошибку P1017 (Server has closed the connection)
				// НЕ обрабатываем P2024 (таймаут пула) - это создаёт каскадные проблемы
				const isConnectionReset =
					errorCode === "P1017" || message.includes("server has closed the connection") || message.includes("удаленный хост принудительно разорвал");

				if (isConnectionReset && errorCode !== "P2024" && attempt < maxRetries) {
					// Увеличиваем задержку с каждой попыткой: 100ms, 200ms
					const delay = 100 * (attempt + 1);
					await new Promise((resolve) => setTimeout(resolve, delay));
					continue; // Пробуем запрос ещё раз
				}

				// Для всех остальных ошибок сразу пробрасываем
				throw error;
			}
		}

		// Если все попытки исчерпаны, пробрасываем последнюю ошибку
		throw lastError;
	});
}

// В development режиме сохраняем экземпляр глобально
// Это предотвращает создание множественных подключений при hot reload
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown для предотвращения утечек соединений
// Добавляем обработчики событий только один раз, чтобы избежать утечек памяти
const globalForHandlers = globalThis as unknown as {
	prismaHandlersAdded: boolean | undefined;
};

if (!globalForHandlers.prismaHandlersAdded) {
	globalForHandlers.prismaHandlersAdded = true;

	process.on("beforeExit", async () => {
		await prisma.$disconnect();
	});

	process.on("SIGINT", async () => {
		await prisma.$disconnect();
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		await prisma.$disconnect();
		process.exit(0);
	});
}
