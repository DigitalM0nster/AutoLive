/*
  Что это: одноразовый скрипт для восстановления роли суперадмина пользователю.
  Зачем: мы случайно сняли у пользователя права суперадмина, нужно вернуть.
  Как работает:
  - Ищем пользователя, у которого номер телефона оканчивается на TARGET_DIGITS
  - Если найден ровно один — меняем ему роль на "superadmin"
  - Если не найден или найдено несколько — выводим понятную ошибку и ничего не меняем

  Запуск (Windows PowerShell, из корня проекта):
  node scripts/restoreSuperadmin.js

  Требования:
  - Должна быть доступна переменная окружения DB_URL (та же, что у приложения)
*/

const { PrismaClient } = require("@prisma/client");

// Последние цифры телефона для точного поиска. Укажем ровно тот номер, который прислал пользователь.
const TARGET_DIGITS = "9954091882";

// Простейшая нормализация телефона: оставляем только цифры
function normalizePhone(phone) {
	return String(phone).replace(/\D+/g, "");
}

async function main() {
	// Создаём отдельный экземпляр PrismaClient для одноразового запуска
	const prisma = new PrismaClient({
		log: ["error"],
		errorFormat: "pretty",
	});

	try {
		const normalizedTarget = normalizePhone(TARGET_DIGITS);

		// 1) Ищем всех пользователей, чьи телефоны заканчиваются на нужные цифры
		//    Это безопаснее, чем полное совпадение, если в базе есть +7 / +380 и т.п.
		const candidates = await prisma.user.findMany({
			where: {
				phone: {
					endsWith: normalizedTarget,
					mode: "insensitive",
				},
			},
			select: { id: true, phone: true, role: true, first_name: true, last_name: true },
		});

		if (candidates.length === 0) {
			console.error(`Пользователь с телефоном, оканчивающимся на ${normalizedTarget}, не найден. Проверьте точный формат телефона в БД.`);
			process.exit(1);
		}

		if (candidates.length > 1) {
			console.error(`Найдено несколько пользователей (${candidates.length}) с похожим номером. Скрипт прерван для безопасности.`);
			candidates.forEach((c) => console.error(`- id=${c.id}, phone=${c.phone}, role=${c.role}`));
			process.exit(1);
		}

		const user = candidates[0];
		if (user.role === "superadmin") {
			console.log(`У пользователя id=${user.id}, phone=${user.phone} уже установлена роль superadmin. Ничего делать не нужно.`);
			process.exit(0);
		}

		// 2) Обновляем роль
		const updated = await prisma.user.update({
			where: { id: user.id },
			data: { role: "superadmin" },
			select: { id: true, phone: true, role: true },
		});

		console.log(`Роль обновлена: id=${updated.id}, phone=${updated.phone}, новая роль=${updated.role}`);

		// 3) Пишем запись в user_log для аудита (если таблица существует в схеме)
		try {
			await prisma.user_log.create({
				data: {
					action: "role_update",
					message: `Ручное восстановление роли до superadmin для пользователя ${updated.phone}`,
					admin_snapshot: null,
					target_user_snapshot: {
						id: updated.id,
						phone: updated.phone,
						role: updated.role,
					},
				},
			});
			console.log("Лог user_log добавлен.");
		} catch (logErr) {
			// Не валим скрипт, если логирование недоступно
			console.warn("Не удалось записать в user_log:", logErr?.message || logErr);
		}
	} catch (e) {
		console.error("Ошибка при выполнении скрипта:", e);
		process.exit(1);
	}
}

main().then(() => process.exit(0));
