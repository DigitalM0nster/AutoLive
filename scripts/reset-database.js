#!/usr/bin/env node

/**
 * Скрипт для полной очистки и пересоздания базы данных
 *
 * Что делает этот скрипт:
 * 1. Удаляет все таблицы из базы данных
 * 2. Заново применяет все миграции
 * 3. Запускает seed для создания стандартных данных
 *
 * ВНИМАНИЕ: Этот скрипт полностью удалит ВСЕ данные из базы!
 */

const { execSync } = require("child_process");
const path = require("path");

console.log("🚨 ВНИМАНИЕ: Этот скрипт полностью удалит ВСЕ данные из базы данных!");
console.log("📋 План действий:");
console.log("   1. Удалить все таблицы");
console.log("   2. Применить миграции заново");
console.log("   3. Запустить seed для создания стандартных данных");
console.log("");

// Функция для выполнения команд с выводом
function runCommand(command, description) {
	console.log(`🔄 ${description}...`);
	try {
		execSync(command, {
			stdio: "inherit",
			cwd: path.resolve(__dirname, ".."),
		});
		console.log(`✅ ${description} - выполнено успешно`);
	} catch (error) {
		console.error(`❌ Ошибка при выполнении: ${description}`);
		console.error(error.message);
		process.exit(1);
	}
}

async function resetDatabase() {
	try {
		// Шаг 1: Удаляем все таблицы (сбрасываем базу данных)
		runCommand("npx prisma db push --force-reset", "Сброс базы данных");

		// Шаг 2: Генерируем Prisma клиент
		runCommand("npx prisma generate", "Генерация Prisma клиента");

		// Шаг 3: Запускаем seed для создания стандартных данных
		runCommand("npm run seed", "Создание стандартных данных");

		console.log("");
		console.log("🎉 База данных успешно очищена и пересоздана!");
		console.log("📊 Созданы стандартные данные:");
		console.log("   - 3 отдела");
		console.log("   - 8 пользователей (включая супер-админа)");
		console.log("   - 8 категорий товаров");
		console.log("   - Товары для каждого отдела");
		console.log("   - 2 акции");
		console.log("");
		console.log("🔑 Данные для входа:");
		console.log("   Супер-админ: 9954091882 / 1234");
		console.log("   Админ 1: 9954091883 / 1234");
		console.log("   Админ 2: 9954091886 / 1234");
		console.log("   Админ 3: 9954091887 / 1234");
	} catch (error) {
		console.error("❌ Критическая ошибка при сбросе базы данных:", error.message);
		process.exit(1);
	}
}

// Запускаем сброс
resetDatabase();
