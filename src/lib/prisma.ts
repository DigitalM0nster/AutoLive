// src\lib\prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Глобальная переменная для хранения экземпляра Prisma Client
// Это нужно для предотвращения создания множественных подключений в development режиме
const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

// Устанавливаем стандартную переменную DB_URL
const databaseUrl = process.env.DB_URL;

if (!databaseUrl) {
	throw new Error("База данных не настроена. Пожалуйста, задайте переменную окружения DB_URL или DATABASE_URL.");
}

// Локально при min: 0 Neon «засыпает», первый запрос после простоя ждёт 20+ секунд — данные не грузятся.
// В development держим одно соединение открытым, чтобы БД не уходила в сон.
const isDev = process.env.NODE_ENV === "development";

// Создаем пул подключений к PostgreSQL
// Pool управляет множественными подключениями к базе данных
// Для бесплатных БД (Neon, Supabase free tier) важно ограничить размер пула
const pool = new Pool({
	connectionString: databaseUrl,
	max: 2,
	// В dev одно соединение держим открытым, чтобы не ждать пробуждения Neon при каждом запросе
	min: isDev ? 1 : 0,
	// Время ожидания получения соединения (Neon после простоя «просыпается» 15–30+ сек)
	connectionTimeoutMillis: 40000,
	// Время ожидания выполнения запроса (в миллисекундах)
	// Увеличено для медленных запросов к Neon
	query_timeout: 60000, // Увеличено с 30 до 60 секунд
	// Время жизни неактивного соединения в пуле (мс). Меньше = чаще переподключаемся,
	// реже держим «мёртвое» соединение после того как Neon закрыл его со своей стороны
	idleTimeoutMillis: 300000, // 5 минут
	// Интервал проверки неактивных соединений (в миллисекундах)
	// Каждые 10 секунд проверяем, какие соединения можно закрыть
	keepAlive: true,
	keepAliveInitialDelayMillis: 10000,
	// SSL настройки для Neon (если требуется)
	// Neon требует SSL соединения
	ssl: databaseUrl.includes("neon.tech") || databaseUrl.includes("neon") ? { rejectUnauthorized: false } : undefined,
});

// Обработка ошибок пула подключений
// Это помогает отслеживать проблемы с подключением к БД
pool.on("error", (err) => {
	console.error("Ошибка пула подключений к базе данных:", err);
	// Не выбрасываем ошибку, чтобы приложение продолжало работать
	// withDbRetry обработает эти ошибки при следующем запросе
});

pool.on("connect", () => {
	// Логируем только в development режиме, чтобы не засорять логи в продакшене
	if (process.env.NODE_ENV === "development") {
		console.log("Установлено новое соединение с базой данных");
	}
});

pool.on("remove", () => {
	// Логируем только в development режиме
	if (process.env.NODE_ENV === "development") {
		console.log("Соединение с базой данных закрыто");
	}
});

// Создаем адаптер Prisma для PostgreSQL
// В Prisma 7.2.0 требуется явно указать адаптер при создании PrismaClient
const adapter = new PrismaPg(pool);

// Создаем экземпляр Prisma Client с адаптером
// В Prisma 7.2.0 необходимо передавать адаптер в конструктор
export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter,
		// Отключаем логирование ошибок, чтобы не засорять консоль
		// Ошибки всё равно обрабатываются через withDbRetry
		log: [],
		errorFormat: "pretty",
	});

// В Prisma 7 метод $use был удалён, вместо него используется $extends или обёртки функций
// Для обработки ошибок соединения используем функцию withDbRetry из utils.ts
// Она уже используется во всех критичных местах проекта

// В development режиме сохраняем экземпляр глобально
// Это предотвращает создание множественных подключений при hot reload
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Keepalive для Neon в development: периодический лёгкий запрос, чтобы соединение не считалось idle
// и Neon реже закрывал его. Чаще = стабильнее, но лишняя нагрузка на БД
const isNeon = databaseUrl.includes("neon.tech") || databaseUrl.includes("neon");
const keepaliveGlobal = globalThis as unknown as { dbKeepaliveStarted?: boolean };
if (isDev && isNeon && !keepaliveGlobal.dbKeepaliveStarted) {
	keepaliveGlobal.dbKeepaliveStarted = true;
	const KEEPALIVE_INTERVAL_MS = 15_000; // 15 сек — баланс между стабильностью и нагрузкой
	setTimeout(() => {
		const tick = async () => {
			try {
				await prisma.$queryRaw`SELECT 1`;
			} catch {
				// Ошибка — не логируем, следующий тик повторит
			}
		};
		tick(); // первый пинг сразу после старта
		const intervalId = setInterval(tick, KEEPALIVE_INTERVAL_MS);
		// Сбрасываем интервал при выходе, чтобы не висел в памяти
		const clear = () => clearInterval(intervalId);
		process.once("beforeExit", clear);
		process.once("SIGINT", clear);
		process.once("SIGTERM", clear);
	}, 3000);
}

// Graceful shutdown для предотвращения утечек соединений
// Добавляем обработчики событий только один раз, чтобы избежать утечек памяти
const globalForHandlers = globalThis as unknown as {
	prismaHandlersAdded: boolean | undefined;
};

if (!globalForHandlers.prismaHandlersAdded) {
	globalForHandlers.prismaHandlersAdded = true;

	// Функция для корректного закрытия всех соединений
	const gracefulShutdown = async () => {
		try {
			// Сначала закрываем Prisma Client
			await prisma.$disconnect();
			// Затем закрываем пул подключений
			await pool.end();
			console.log("Соединения с базой данных корректно закрыты");
		} catch (error) {
			console.error("Ошибка при закрытии соединений с БД:", error);
		}
	};

	process.on("beforeExit", async () => {
		await gracefulShutdown();
	});

	process.on("SIGINT", async () => {
		await gracefulShutdown();
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		await gracefulShutdown();
		process.exit(0);
	});
}
