// src/app/api/admin/auth/reset-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Функция генерации 4-х значного кода
const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

export async function POST(req: NextRequest) {
	try {
		const { phone } = await req.json();

		if (!phone) {
			return NextResponse.json({ error: "Введите телефон" }, { status: 400 });
		}

		// Ищем сотрудника с доступом к панели управления
		const user = await prisma.user.findUnique({ where: { phone } });

		if (!user) {
			return NextResponse.json({ error: "Сотрудник с таким телефоном не найден" }, { status: 404 });
		}

		if (!["superadmin", "admin", "manager"].includes(user.role)) {
			return NextResponse.json({ error: "У этой учётной записи нет доступа к панели управления" }, { status: 403 });
		}

		// Генерируем и хешируем новый пароль
		const newPassword = generateCode();
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		await prisma.user.update({
			where: { phone },
			data: { password: hashedPassword },
		});

		// Обратите внимание: в production-режиме новый пароль не должен возвращаться в ответе,
		// вместо этого его можно отправлять через SMS или email

		return NextResponse.json({
			success: true,
			message: "Пароль успешно сброшен",
			newPassword, // временно для отладки (в будущем убрать)
		});
	} catch (error) {
		console.error("Ошибка при сбросе пароля для панели управления:", error);
		return NextResponse.json({ error: "Ошибка сервера, попробуйте позже" }, { status: 500 });
	}
}
