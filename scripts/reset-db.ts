// scripts/reset-db.ts

import { db } from "../src/drizzle/db";
import { sql } from "drizzle-orm";

async function resetDatabase() {
	console.log("🗑️ Начинаем полную пересоздание базы данных...");

	try {
		// Отключаем проверку внешних ключей
		await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

		// Список всех таблиц в проекте
		const tables = ["__drizzle_migrations", "user_log", "department_log", "orders", "products", "department_categories", "categories", "departments", "users", "promotions"];

		// Удаляем все таблицы
		for (const tableName of tables) {
			console.log(`🗑️ Удаляем таблицу: ${tableName}`);
			await db.execute(sql`DROP TABLE IF EXISTS \`${tableName}\``);
		}

		// Включаем проверку внешних ключей
		await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

		console.log("✅ База данных полностью очищена!");
		console.log("📝 Теперь запустите миграции и сид:");
		console.log("   npm run drizzle:generate");
		console.log("   npm run drizzle:seed");
	} catch (error) {
		console.error("❌ Ошибка при очистке базы данных:", error);
	}
}

resetDatabase();
