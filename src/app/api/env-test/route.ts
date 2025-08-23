// src/app/api/test-db/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
	try {
		// Проверяем подключение к БД
		await prisma.$connect();

		// Пробуем выполнить простой запрос
		const userCount = await prisma.user.count();

		return NextResponse.json({
			success: true,
			message: "Подключение к БД reg.ru успешно!",
			userCount: userCount,
			databaseUrl: process.env.DATABASE_URL,
		});
	} catch (error) {
		console.error("Ошибка подключения к БД:", error);
		return NextResponse.json(
			{
				success: false,
				error: String(error),
				databaseUrl: process.env.DATABASE_URL,
			},
			{ status: 500 }
		);
	} finally {
		await prisma.$disconnect();
	}
}
