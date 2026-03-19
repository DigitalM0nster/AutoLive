// Публичный endpoint для списка пунктов выдачи (без авторизации, для страницы контактов)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/utils";

// GET /api/pickup-points/public — список пунктов выдачи для сайта
export async function GET() {
	try {
		// Только пункты с галочкой «отображать на странице Контакты»
		const list = await withDbRetry(() =>
			prisma.pickupPoint.findMany({
				where: { showOnContactsPage: true },
				select: {
					id: true,
					name: true,
					address: true,
					phones: true,
					emails: true,
					workingHours: true,
					latitude: true,
					longitude: true,
				},
				orderBy: { name: "asc" },
			})
		);
		return NextResponse.json(list);
	} catch (err) {
		console.error("Ошибка загрузки пунктов выдачи (public):", err);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
