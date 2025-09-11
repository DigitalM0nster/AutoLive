// src\lib\prisma.ts
import { PrismaClient } from "@prisma/client";

// Глобальная переменная для хранения экземпляра Prisma Client
// Это нужно для предотвращения создания множественных подключений в development режиме
const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

// Создаем экземпляр Prisma Client с настройками логирования
export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ["query", "info", "warn", "error"],
		errorFormat: "pretty",
	});

// В development режиме сохраняем экземпляр глобально
// Это предотвращает создание множественных подключений при hot reload
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
