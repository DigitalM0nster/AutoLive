// src/app/api/categories/create-category/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
	try {
		const { title, slug, description, image } = await req.json();

		if (!title || !slug) {
			return NextResponse.json({ error: "Название и slug обязательны" }, { status: 400 });
		}

		const existing = await prisma.category.findUnique({ where: { slug } });
		if (existing) {
			return NextResponse.json({ error: "Раздел с таким slug уже существует" }, { status: 400 });
		}

		const category = await prisma.category.create({
			data: { title, slug, description, image },
		});

		return NextResponse.json({ success: true, category });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
