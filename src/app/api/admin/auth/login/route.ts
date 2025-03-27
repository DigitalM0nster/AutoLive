// src/app/api/admin/auth/login/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
	const { phone, password } = await req.json();

	// 1. Ищем пользователя по телефону
	const user = await prisma.user.findUnique({
		where: { phone },
	});

	// 2. Нет такого?
	if (!user || !["superadmin", "admin", "manager"].includes(user.role)) {
		return NextResponse.json({ error: "Пользователь не найден или не админ" }, { status: 401 });
	}

	// 3. Проверяем пароль
	const isCorrect = await bcrypt.compare(password, user.password);

	if (!isCorrect) {
		return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
	}

	// 4. Генерируем JWT
	const token = jwt.sign(
		{
			id: user.id,
			name: `${user.first_name} ${user.last_name}`,
			phone: user.phone,
			role: user.role,
		},
		process.env.JWT_SECRET!,
		{ expiresIn: "7d" }
	);

	// 5. Сохраняем токен в куки
	const cookieStore = await cookies();
	cookieStore.set("authToken", token, {
		httpOnly: true,
		path: "/",
		maxAge: 60 * 60 * 24 * 7, // 7 дней
	});

	return NextResponse.json({ message: "Успешный вход" });
}
