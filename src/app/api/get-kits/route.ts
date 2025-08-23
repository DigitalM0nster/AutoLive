// src/app/api/get-kits/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		// Получаем все комплекты ТО из базы данных
		const kits = await prisma.serviceKit.findMany({
			orderBy: {
				title: "asc",
			},
		});

		// Если комплектов нет, возвращаем пустой массив
		if (!kits || kits.length === 0) {
			return NextResponse.json([]);
		}

		// Форматируем данные для фронтенда
		const formattedKits = kits.map((kit) => ({
			id: kit.id,
			name: kit.title, // Используем title из базы данных как name для фронтенда
			title: kit.title,
			description: kit.description || "",
			image: kit.image || "/images/no-image.png",
			price: kit.price || 0,
			itemsCount: 0, // Пока не загружаем количество элементов
		}));

		return NextResponse.json(formattedKits);
	} catch (error) {
		console.error("Ошибка при получении комплектов ТО:", error);

		// В случае ошибки возвращаем пустой массив
		// Это предотвратит падение страницы
		return NextResponse.json([]);
	}
}
