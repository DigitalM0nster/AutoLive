// src/app/api/breadcrumbs/resolve/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const ids: string[] = body.ids;

		const results: Record<string, string> = {};

		// Категории
		const categoryIds = ids.filter((id) => /^\d+$/.test(id));
		if (categoryIds.length) {
			const categories = await prisma.category.findMany({
				where: { id: { in: categoryIds.map(Number) } },
				select: { id: true, title: true },
			});
			for (const cat of categories) {
				results[String(cat.id)] = cat.title;
			}
		}

		// (добавим другие сущности тут — товары, пользователи и т.д.)

		return NextResponse.json({ labels: results });
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
	}
}
