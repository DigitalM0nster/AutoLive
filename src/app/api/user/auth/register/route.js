import { NextResponse } from "next/server";
import { getDatabaseConnection } from "@/app/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(req) {
	try {
		const { phone, code } = await req.json();
		console.log("📩 Запрос на регистрацию:", { phone, code });

		if (!phone || !code) {
			console.log("❌ Ошибка: отсутствует phone или code");
			return NextResponse.json({ error: "Введите телефон и код" }, { status: 400 });
		}

		const connection = await getDatabaseConnection();
		console.log("✅ Подключение к БД установлено");

		// Проверяем код подтверждения
		const [rows] = await connection.execute("SELECT id FROM sms_codes WHERE phone = ? AND code = ? AND expires_at > NOW() AND used = FALSE", [phone, code]);
		console.log("📌 Код подтверждения найден:", rows);

		if (rows.length === 0) {
			console.log("❌ Ошибка: неверный или просроченный код");
			await connection.end();
			return NextResponse.json({ error: "Неверный или просроченный код" }, { status: 400 });
		}

		// Отмечаем код как использованный
		await connection.execute("UPDATE sms_codes SET used = TRUE WHERE id = ?", [rows[0].id]);
		console.log("✅ Код помечен как использованный");

		// Проверяем, есть ли уже пользователь
		const [users] = await connection.execute("SELECT id FROM users WHERE phone = ? LIMIT 1", [phone]);
		console.log("📌 Найденные пользователи:", users);

		if (users.length > 0) {
			console.log("❌ Ошибка: пользователь уже зарегистрирован");
			await connection.end();
			return NextResponse.json({ error: "Пользователь с таким номером уже зарегистрирован" }, { status: 400 });
		}

		// Хешируем пароль (код подтверждения)
		const hashedPassword = await bcrypt.hash(code, 10);
		console.log("🔐 Захешированный пароль создан");

		// Создаём нового пользователя
		const [result] = await connection.execute("INSERT INTO users (phone, password, role) VALUES (?, ?, 'user')", [phone, hashedPassword]);
		console.log("✅ Новый пользователь создан:", result);

		const userId = result.insertId; // Получаем ID нового пользователя
		console.log("🆔 ID нового пользователя:", userId);

		// Удаляем все старые коды
		await connection.execute("DELETE FROM sms_codes WHERE phone = ?", [phone]);
		console.log("🗑️ Старые коды удалены");

		// Проверяем наличие JWT_SECRET
		if (!process.env.JWT_SECRET) {
			console.error("❌ Ошибка: JWT_SECRET не установлен в .env.local");
			await connection.end();
			return NextResponse.json({ error: "Ошибка сервера: нет JWT_SECRET" }, { status: 500 });
		}

		// Создаём JWT токен
		const token = jwt.sign(
			{
				userId, // Используем теперь ID вместо phone
				phone,
				role: "user",
			},
			process.env.JWT_SECRET,
			{ expiresIn: "7d" }
		);
		console.log("🔑 JWT-токен создан");

		await connection.end();
		return NextResponse.json({ token, userId, success: true });
	} catch (error) {
		console.error("❌ Ошибка при регистрации:", error);
		return NextResponse.json({ error: "Ошибка сервера, попробуйте позже" }, { status: 500 });
	}
}
