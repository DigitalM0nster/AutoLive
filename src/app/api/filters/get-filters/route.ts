// src/app/api/filters/get-filters/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const categoryId = searchParams.get("categoryId");

		if (!categoryId) {
			return NextResponse.json({ error: "categoryId обязателен" }, { status: 400 });
		}

		const filters = await prisma.filter.findMany({
			where: {
				categoryId: Number(categoryId),
			},
			include: {
				values: {
					orderBy: {
						value: "asc",
					},
				},
			},
			orderBy: {
				title: "asc",
			},
		});

		return NextResponse.json(filters);
	} catch (error) {
		console.error("Ошибка получения фильтров:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
