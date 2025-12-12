// src/app/api/test-db/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		// Пробуем выполнить простой запрос
		// Используем общий экземпляр Prisma, не нужно вызывать $connect() или $disconnect()
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
	}
}
