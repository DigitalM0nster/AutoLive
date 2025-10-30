// src\lib\prisma.ts
import { PrismaClient } from "@prisma/client";

// Глобальная переменная для хранения экземпляра Prisma Client
// Это нужно для предотвращения создания множественных подключений в development режиме
const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

// Создаем экземпляр Prisma Client с оптимизированными настройками для Neon PostgreSQL
export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ["error"], // Убираем лишние логи для уменьшения нагрузки
		errorFormat: "pretty",
		// Настройки для оптимизации подключений к Neon PostgreSQL
		// Можно легко изменить connection_limit при росте нагрузки:
		// 1-10 пользователей: connection_limit=1
		// 50-100 пользователей: connection_limit=2
		// 100+ пользователей: connection_limit=3
		datasources: {
			db: {
				// Для локальной разработки на Windows/Neon: pgbouncer=true, sslmode=require,
				// минимальный connection_limit для стабильности, увеличенные таймауты
				url: (process.env.DB_URL || "") + "?pgbouncer=true&sslmode=require&connection_limit=1&pool_timeout=120&connect_timeout=120",
			},
		},
		// Дополнительные настройки для стабильности
		transactionOptions: {
			maxWait: 10000, // Максимальное время ожидания транзакции
			timeout: 30000, // Таймаут транзакции
		},
	});

// В development режиме сохраняем экземпляр глобально
// Это предотвращает создание множественных подключений при hot reload
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown для предотвращения утечек соединений
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
