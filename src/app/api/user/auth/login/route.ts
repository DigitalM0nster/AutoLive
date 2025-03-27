import { NextRequest, NextResponse } from "next/server";
import { getDatabaseConnection } from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
	try {
		const { phone, password } = await req.json();

		if (!phone || !password) {
			return NextResponse.json({ error: "Введите телефон и пароль", code: "MISSING_CREDENTIALS" }, { status: 400 });
		}

		const db = await getDatabaseConnection();

		type UserRow = {
			id: number;
			password: string;
		} & RowDataPacket;

		const [users] = await db.execute<UserRow[]>("SELECT id, password FROM users WHERE phone = ?", [phone]);

		if (users.length === 0) {
			await db.end();
			return NextResponse.json({ error: "Пользователь не найден", code: "USER_NOT_FOUND" }, { status: 404 });
		}

		const user = users[0];

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			await db.end();
			return NextResponse.json({ error: "Неверный пароль", code: "INVALID_PASSWORD" }, { status: 401 });
		}

		if (!process.env.JWT_SECRET) {
			console.error("❌ JWT_SECRET не установлен в .env.local");
			await db.end();
			return NextResponse.json({ error: "Ошибка сервера", code: "SERVER_ERROR" }, { status: 500 });
		}

		const token = jwt.sign({ userId: user.id, phone }, process.env.JWT_SECRET, {
			expiresIn: "7d",
		});

		await db.end();

		const cookieStore = await cookies();
		cookieStore.set("userToken", token, {
			httpOnly: true,
			path: "/",
			maxAge: 60 * 60 * 24 * 7, // 7 дней
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Ошибка при входе:", error);
		return NextResponse.json({ error: "Ошибка сервера, попробуйте позже", code: "SERVER_ERROR" }, { status: 500 });
	}
}
