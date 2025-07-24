// drizzle.config.ts
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

export default {
	schema: "./src/drizzle/schema.ts",
	out: "./src/drizzle/migrations",
	driver: "mysql2",
	dbCredentials: {
		host: process.env.DATABASE_HOST || "localhost",
		user: process.env.DATABASE_USER || "",
		password: process.env.DATABASE_PASSWORD || "",
		database: process.env.DATABASE_NAME || "",
		ssl: process.env.DATABASE_SSL === "true" ? {} : undefined,
	},
	// Можно указать таблицы, которые нужно включить или исключить из миграции
	// include: ['table1', 'table2'],
	// exclude: ['table3', 'table4'],
} satisfies Config;
