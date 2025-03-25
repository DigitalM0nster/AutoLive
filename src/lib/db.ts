// src\app\lib\db.ts
import mysql, { Connection } from "mysql2/promise";

export async function getDatabaseConnection(): Promise<Connection> {
	try {
		console.log("🟢 Подключение к базе данных...");
		console.log("DB_HOST:", process.env.DB_HOST);
		console.log("DB_USER:", process.env.DB_USER);
		console.log("DB_NAME:", process.env.DB_NAME);

		const connection = await mysql.createConnection({
			host: process.env.DB_HOST,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_NAME,
			port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
		});

		console.log("✅ Успешное подключение к базе!");
		return connection;
	} catch (error: any) {
		console.error("❌ Ошибка подключения к базе данных:", error.message);
		throw new Error("Ошибка подключения к базе данных");
	}
}
