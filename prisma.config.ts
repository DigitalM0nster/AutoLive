import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Загружаем .env и .env.local (как в Next.js: .env.local переопределяет .env)
// Иначе при запуске Prisma CLI из корня проекта переменные из .env.local не видны
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

// Конфигурация для миграций Prisma. Для Neon задай DIRECT_DB_URL (Direct connection, без -pooler), иначе P1017
export default defineConfig({
	schema: "prisma/schema.prisma",
	datasource: {
		url: process.env.DIRECT_DB_URL || process.env.DB_URL,
	},
});
