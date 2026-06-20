// src\app\api\admin\auth\login\route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ используем общий клиент
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
	try {
		const { phone, password } = await req.json();

		if (!phone || !password) {
			return NextResponse.json({ error: "Введите телефон и пароль" }, { status: 400 });
		}

		const user = await prisma.user.findUnique({
			where: { phone },
		});

		if (!user) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 401 });
		}

		if (!["superadmin", "admin", "manager"].includes(user.role)) {
			return NextResponse.json({ error: "Недостаточно прав доступа" }, { status: 401 });
		}

		const isCorrect = await bcrypt.compare(password, user.password);

		if (!isCorrect) {
			return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
		}

		// Формируем ФИО в правильном порядке: Фамилия, Имя, Отчество
		const nameParts = [];
		if (user.last_name) nameParts.push(user.last_name);
		if (user.first_name) nameParts.push(user.first_name);
		if (user.middle_name) nameParts.push(user.middle_name);
		const fullName = nameParts.join(" ");

		if (!process.env.JWT_SECRET) {
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}

		const token = jwt.sign(
			{
				id: user.id,
				name: fullName,
				phone: user.phone,
				role: user.role,
				departmentId: user.departmentId ?? null,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "7d" }
		);

		const res = NextResponse.json({ message: "Успешный вход" });

		res.cookies.set("authToken", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
		});

		return res;
	} catch (error) {
		console.error("❌ Админ логин - ошибка:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
