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
		const existingCode = await prisma.sms_code.findFirst({
			where: {
				phone,
				expires_at: { gt: new Date() },
				used: false,
			},
			orderBy: { expires_at: "desc" },
		});

		if (existingCode) {
			const expiresIn = Math.max(0, Math.floor((existingCode.expires_at.getTime() - Date.now()) / 1000));
			return NextResponse.json({ error: "Код уже отправлен", remainingTime: expiresIn }, { status: 429 });
		}

		// Удаляем старые коды
		await prisma.sms_code.deleteMany({ where: { phone } });

		const code = generateCode();
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут

		await prisma.sms_code.create({
			data: {
				phone,
				code,
				expires_at: expiresAt,
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
