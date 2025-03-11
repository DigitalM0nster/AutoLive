import { NextResponse } from "next/server";
import { getDatabaseConnection } from "@/app/lib/db";

const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

export async function POST(req) {
	try {
		const { phone } = await req.json();
		console.log(`📩 Запрос на отправку кода для номера: ${phone}`);

		if (!phone) {
			console.log("❌ Ошибка: номер телефона не передан");
			return NextResponse.json({ error: "Введите телефон" }, { status: 400 });
		}

		const db = await getDatabaseConnection();

		// Ищем пользователя по номеру
		const [users] = await db.execute("SELECT id FROM users WHERE phone = ? LIMIT 1", [phone]);

		// ✅ Если пользователь уже зарегистрирован, ОТКАЗЫВАЕМ в отправке кода
		if (users.length > 0) {
			console.log("❌ Ошибка: пользователь уже зарегистрирован");
			await db.end();
			return NextResponse.json({ error: "Пользователь с таким номером уже зарегистрирован" }, { status: 400 });
		}

		// Проверяем, был ли недавно отправлен код
		const [lastCode] = await db.execute("SELECT expires_at FROM sms_codes WHERE phone = ? ORDER BY expires_at DESC LIMIT 1", [phone]);

		if (lastCode.length > 0) {
			const expiresAt = new Date(lastCode[0].expires_at);
			const now = new Date();
			const remainingTime = Math.max(0, Math.floor((expiresAt - now) / 1000));

			if (expiresAt > now) {
				console.log(`⏳ Код уже отправлен, осталось ${remainingTime} секунд`);
				await db.end();
				return NextResponse.json({ error: "Код уже отправлен", remainingTime }, { status: 429 });
			}
		}

		// Удаляем старые коды перед добавлением нового
		await db.execute("DELETE FROM sms_codes WHERE phone = ?", [phone]);
		console.log("🗑️ Старые коды удалены");

		// Генерируем новый код
		const code = generateCode();
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // +5 минут
		const expiresIn = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

		// Записываем код в БД
		await db.execute("INSERT INTO sms_codes (user_id, phone, code, expires_at, used) VALUES (NULL, ?, ?, ?, 0)", [phone, code, expiresAt]);
		console.log(`✅ Код ${code} сохранён в БД`);

		await db.end();
		return NextResponse.json({ success: true, message: "Код отправлен", expiresIn });
	} catch (error) {
		console.error("❌ Ошибка при отправке кода:", error);
		return NextResponse.json({ error: "Ошибка сервера, попробуйте позже" }, { status: 500 });
	}
}
