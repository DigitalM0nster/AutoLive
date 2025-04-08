// src\app\api\user\auth\login\route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

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
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) {
			return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
		}

		if (!process.env.JWT_SECRET) {
			console.error("❌ JWT_SECRET не задан в .env");
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}

		const token = jwt.sign(
			{
				id: user.id,
				phone: user.phone,
				name: user.first_name || "",
				role: user.role,
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
		console.error("Ошибка логина:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
