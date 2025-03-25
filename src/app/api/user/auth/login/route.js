import { NextResponse } from "next/server";
import { getDatabaseConnection } from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(req) {
	try {
		const { phone, password } = await req.json();
		if (!phone || !password) {
			return NextResponse.json({ error: "Введите телефон и пароль", code: "MISSING_CREDENTIALS" }, { status: 400 });
		}

		const db = await getDatabaseConnection();

		// Проверяем, существует ли пользователь
		const [users] = await db.execute("SELECT id, password FROM users WHERE phone = ?", [phone]);

		if (users.length === 0) {
			await db.end();
			return NextResponse.json({ error: "Пользователь не найден", code: "USER_NOT_FOUND" }, { status: 404 });
		}

		const user = users[0];

		// Проверяем пароль
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			await db.end();
			return NextResponse.json({ error: "Неверный пароль", code: "INVALID_PASSWORD" }, { status: 401 });
		}

		// Генерируем JWT токен
		if (!process.env.JWT_SECRET) {
			console.error("❌ Ошибка: JWT_SECRET не установлен в .env.local");
			await db.end();
			return NextResponse.json({ error: "Ошибка сервера", code: "SERVER_ERROR" }, { status: 500 });
		}

		const token = jwt.sign({ userId: user.id, phone }, process.env.JWT_SECRET, { expiresIn: "7d" });

		await db.end();
		return NextResponse.json({ token, success: true });
	} catch (error) {
		console.error("Ошибка при входе:", error);
		return NextResponse.json({ error: "Ошибка сервера, попробуйте позже", code: "SERVER_ERROR" }, { status: 500 });
	}
}
