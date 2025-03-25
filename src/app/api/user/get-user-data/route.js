import { NextResponse } from "next/server";
import { getDatabaseConnection } from "@/lib/db";
import jwt from "jsonwebtoken";

export async function GET(req) {
	try {
		// 1. Проверяем, передан ли токен
		const authHeader = req.headers.get("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return NextResponse.json({ error: "Нет токена", code: "NO_TOKEN" }, { status: 401 });
		}

		const token = authHeader.split("Bearer ")[1];

		// 2. Проверяем, установлен ли JWT_SECRET
		if (!process.env.JWT_SECRET) {
			console.error("❌ Ошибка: JWT_SECRET не установлен в .env.local");
			return NextResponse.json({ error: "Ошибка сервера", code: "SERVER_ERROR" }, { status: 500 });
		}

		// 3. Декодируем токен
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch (err) {
			console.error("❌ Ошибка верификации токена:", err);
			return NextResponse.json({ error: "Неверный токен", code: "INVALID_TOKEN" }, { status: 401 });
		}

		// 4. Получаем данные пользователя из БД
		const db = await getDatabaseConnection();
		const [users] = await db.execute("SELECT first_name, last_name, phone, role FROM users WHERE id = ? LIMIT 1", [decoded.userId]);

		await db.end();

		// 5. Если пользователя нет
		if (users.length === 0) {
			return NextResponse.json({ error: "Пользователь не найден", code: "USER_NOT_FOUND" }, { status: 404 });
		}

		// 6. Возвращаем данные пользователя
		return NextResponse.json(users[0]);
	} catch (error) {
		console.error("❌ Ошибка получения данных пользователя:", error);
		return NextResponse.json({ error: "Ошибка сервера, попробуйте позже", code: "SERVER_ERROR" }, { status: 500 });
	}
}
