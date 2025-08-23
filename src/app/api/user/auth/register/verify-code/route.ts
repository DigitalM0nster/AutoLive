import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
	try {
		const { phone, code } = await req.json();

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

		// Проверяем, не зарегистрирован ли уже пользователь с таким телефоном
		const existingUser = await prisma.user.findUnique({ where: { phone } });
		if (existingUser) {
			return NextResponse.json({ error: "Пользователь уже зарегистрирован" }, { status: 400 });
		}

		// Код верный и пользователь не зарегистрирован
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("❌ Ошибка при проверке кода:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
