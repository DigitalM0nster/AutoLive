// src/app/api/categories/get-categories/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		const categories = await prisma.category.findMany({
			select: {
				id: true,
				title: true,
				image: true,
			},
			orderBy: {
				id: "asc",
			},
		});

		return NextResponse.json(categories);
	} catch (error) {
		console.error("Ошибка загрузки категорий:", error);
		return NextResponse.json({ error: "Ошибка загрузки категорий" }, { status: 500 });
	}
}
