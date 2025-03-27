// src/app/api/filters/create-filter/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
	try {
		const { title, categoryId } = await req.json();

		if (!title || !categoryId) {
			return NextResponse.json({ error: "title и categoryId обязательны" }, { status: 400 });
		}

		const filter = await prisma.filter.create({
			data: {
				title,
				categoryId: Number(categoryId),
			},
			include: { values: true },
		});

		return NextResponse.json({ success: true, filter });
	} catch (error) {
		console.error("Ошибка создания фильтра:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
