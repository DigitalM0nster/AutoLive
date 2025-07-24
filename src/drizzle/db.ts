// src/drizzle/db.ts
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Создаем пул соединений с базой данных
const poolConnection = mysql.createPool({
	host: process.env.DATABASE_HOST || "localhost",
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	ssl: process.env.DB_SSL === "true" ? {} : undefined,
});

// Создаем экземпляр Drizzle ORM с типизацией
export const db = drizzle(poolConnection, { schema, mode: "default" });

// Функция для проверки соединения с базой данных
export async function checkDatabaseConnection() {
	try {
		const connection = await poolConnection.getConnection();
		connection.release();
		return true;
	} catch (error) {
		console.error("Ошибка подключения к базе данных:", error);
		return false;
	}
}
