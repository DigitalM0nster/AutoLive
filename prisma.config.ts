import { defineConfig } from "prisma/config";
import "dotenv/config";

// Конфигурация для миграций Prisma
// Этот файл используется только для prisma migrate dev/deploy
// Для Prisma Client используется schema.prisma
export default defineConfig({
	schema: "prisma/schema.prisma",
	datasource: {
		url: process.env.DB_URL || process.env.DATABASE_URL!,
	},
});
