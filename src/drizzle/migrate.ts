// src/drizzle/migrate.ts
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

// Функция для выполнения миграции
async function runMigration() {
	// Создаем соединение с базой данных
	const connection = await mysql.createConnection({
		host: process.env.DATABASE_HOST || "localhost",
		user: process.env.DATABASE_USER,
		password: process.env.DATABASE_PASSWORD,
		database: process.env.DATABASE_NAME,
		multipleStatements: true,
		ssl: process.env.DATABASE_SSL === "true" ? {} : undefined,
	});

	// Создаем экземпляр Drizzle ORM
	const db = drizzle(connection);

	// Выполняем миграцию
	console.log("Начинаем миграцию...");

	try {
		await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
		console.log("Миграция успешно выполнена!");
	} catch (error) {
		console.error("Ошибка при выполнении миграции:", error);
	} finally {
		// Закрываем соединение с базой данных
		await connection.end();
	}
}

// Запускаем миграцию
runMigration().catch(console.error);
