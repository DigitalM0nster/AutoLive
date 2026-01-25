// src/app/api/booking-departments/public/route.ts
// Публичный endpoint для получения списка отделов для записей (без авторизации)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/utils";

// GET /api/booking-departments/public - Получить список отделов для записей (публичный, без авторизации)
export async function GET(req: NextRequest) {
	try {
		// Все могут видеть отделы для записей без авторизации
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const bookingDepartments = await withDbRetry(async () => {
			return await prisma.bookingDepartment.findMany({
				select: {
					id: true,
					name: true,
					address: true,
					phones: true,
					emails: true,
					createdAt: true,
					updatedAt: true,
				},
				orderBy: {
					name: "asc",
				},
			});
		});

		return NextResponse.json(bookingDepartments);
	} catch (err) {
		console.error("Ошибка загрузки отделов для записей:", err);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
