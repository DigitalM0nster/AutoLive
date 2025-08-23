import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
	try {
		const { phone, code, first_name, last_name, middle_name } = await req.json();

		if (!phone || !code) {
			return NextResponse.json({ error: "Введите телефон и код" }, { status: 400 });
		}

		// Находим актуальный (неиспользованный) код
		const smsCode = await prisma.sms_code.findFirst({
			where: {
				phone,
				code,
				used: false,
				expires_at: { gt: new Date() },
			},
		});

		if (!smsCode) {
			return NextResponse.json({ error: "Неверный или просроченный код" }, { status: 400 });
		}

		// Проверка: вдруг пользователь уже есть
		const existingUser = await prisma.user.findUnique({ where: { phone } });
		if (existingUser) {
			return NextResponse.json({ error: "Пользователь уже зарегистрирован" }, { status: 400 });
		}

		// Хешируем код как временный пароль
		const hashedPassword = await bcrypt.hash(code, 10);

		// Создаём пользователя
		const user = await prisma.user.create({
			data: {
				phone,
				password: hashedPassword,
				first_name: first_name || null,
				last_name: last_name || null,
				middle_name: middle_name || null,
				role: "client",
				status: "unverified",
			},
		});

		// Отмечаем код как использованный
		await prisma.sms_code.update({
			where: { id: smsCode.id },
			data: { used: true },
		});

		// Удалим все старые коды
		await prisma.sms_code.deleteMany({ where: { phone } });

		if (!process.env.JWT_SECRET) {
			console.error("❌ JWT_SECRET не задан");
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}

		const token = jwt.sign(
			{
				id: user.id,
				phone: user.phone,
				role: user.role,
				name: user.first_name || "",
				middle_name: user.middle_name || "",
				status: user.status,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "7d" }
		);

		const cookieStore = await cookies();
		cookieStore.set("authToken", token, {
			httpOnly: true,
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("❌ Ошибка при регистрации:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
