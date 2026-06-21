// src\app\api\user\auth\reset-password\route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { phoneForStorage } from "@/lib/phoneUtils";
import { sendPasswordResetSms } from "@/lib/smsService";

const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

export async function POST(req: NextRequest) {
	try {
		const { phone: rawPhone } = await req.json();
		const phone = phoneForStorage(String(rawPhone || ""));

		if (!phone || phone.length !== 10) {
			return NextResponse.json({ error: "Введите корректный номер телефона" }, { status: 400 });
		}

		const user = await prisma.user.findUnique({ where: { phone } });

		if (!user) {
			return NextResponse.json({ error: "Пользователь с таким номером не найден" }, { status: 404 });
		}

		// Генерируем и хешируем новый пароль
		const newPassword = generateCode();
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		await prisma.user.update({
			where: { phone },
			data: { password: hashedPassword },
		});

		const smsResult = await sendPasswordResetSms(phone, newPassword);

		return NextResponse.json({
			success: true,
			message: smsResult.smsNotConnected
				? "SMS-сервис не подключён. Новый пароль показан для теста."
				: "Новый пароль отправлен на ваш номер телефона",
			...(smsResult.testCode ? { newPassword: smsResult.testCode } : {}),
			...(smsResult.smsNotConnected ? { smsNotConnected: true } : {}),
		});
	} catch (error) {
		console.error("Ошибка при сбросе пароля:", error);
		return NextResponse.json({ error: "Ошибка сервера, попробуйте позже" }, { status: 500 });
	}
}
