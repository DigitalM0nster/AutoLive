import { NextResponse } from "next/server";
import { getDatabaseConnection } from "@/app/lib/db";
import bcrypt from "bcrypt";

const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

export async function POST(req) {
	try {
		const { phone } = await req.json();
		if (!phone) {
			return NextResponse.json({ error: "Введите телефон" }, { status: 400 });
		}

		const db = await getDatabaseConnection();

		// Проверяем, существует ли пользователь
		const [users] = await db.execute("SELECT id FROM users WHERE phone = ?", [phone]);

		if (users.length === 0) {
			await db.end();
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Генерируем новый 4-значный пароль
		const newPassword = generateCode();
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Обновляем пароль в БД
		await db.execute("UPDATE users SET password = ? WHERE phone = ?", [hashedPassword, phone]);

		console.log(`🔑 Новый пароль для ${phone}: ${newPassword}`); // В будущем тут будет отправка SMS

		await db.end();
		return NextResponse.json({ success: true, message: "Пароль успешно сброшен", newPassword });
	} catch (error) {
		console.error("Ошибка при сбросе пароля:", error);
		return NextResponse.json({ error: "Ошибка сервера, попробуйте позже" }, { status: 500 });
	}
}
