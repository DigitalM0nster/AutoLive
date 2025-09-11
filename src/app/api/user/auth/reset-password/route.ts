// src\app\api\user\auth\reset-password\route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

export async function POST(req: NextRequest) {
	try {
		const { phone } = await req.json();

		if (!phone) {
			return NextResponse.json({ error: "Введите телефон" }, { status: 400 });
		}

		// Проверяем, существует ли пользователь
		const user = await prisma.user.findUnique({ where: { phone } });

		if (!user) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Генерируем и хешируем новый пароль
		const newPassword = generateCode();
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		await prisma.user.update({
			where: { phone },
			data: { password: hashedPassword },
		});

		return NextResponse.json({
			success: true,
			message: "Пароль успешно сброшен",
			newPassword, // в проде скрываем
		});
	} catch (error) {
		console.error("Ошибка при сбросе пароля:", error);
		return NextResponse.json({ error: "Ошибка сервера, попробуйте позже" }, { status: 500 });
	}
}
