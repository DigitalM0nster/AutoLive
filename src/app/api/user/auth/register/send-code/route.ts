// src\app\api\user\auth\register\send-code\route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

export async function POST(req: NextRequest) {
	try {
		const { phone } = await req.json();

		if (!phone) {
			return NextResponse.json({ error: "Введите телефон" }, { status: 400 });
		}

		// Проверка: уже зарегистрирован?
		const existingUser = await prisma.user.findUnique({ where: { phone } });
		if (existingUser) {
			return NextResponse.json({ error: "Пользователь с таким номером уже зарегистрирован" }, { status: 400 });
		}

		// Проверка: уже есть активный код?
		const existingCode = await prisma.smsCode.findFirst({
			where: {
				phone,
				expiresAt: { gt: new Date() },
				used: false,
			},
			orderBy: { expiresAt: "desc" },
		});

		if (existingCode) {
			const expiresIn = Math.max(0, Math.floor((existingCode.expiresAt.getTime() - Date.now()) / 1000));
			return NextResponse.json({ error: "Код уже отправлен", remainingTime: expiresIn }, { status: 429 });
		}

		// Удаляем старые коды
		await prisma.smsCode.deleteMany({ where: { phone } });

		const code = generateCode();
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут

		await prisma.smsCode.create({
			data: {
				phone,
				code,
				expiresAt,
				used: false,
			},
		});

		console.log(`✅ Отправлен код ${code} для телефона ${phone}`);
		// тут ты позже вставишь отправку SMS

		return NextResponse.json({ success: true, expiresIn: 300 });
	} catch (error) {
		console.error("Ошибка при отправке кода:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
