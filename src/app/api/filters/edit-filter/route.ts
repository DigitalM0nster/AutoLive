// src/app/api/filters/edit-filter/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
	try {
		const { id, title } = await req.json();

		if (!id || !title) {
			return NextResponse.json({ error: "id и title обязательны" }, { status: 400 });
		}

		const updated = await prisma.filter.update({
			where: { id: Number(id) },
			data: { title },
		});

		return NextResponse.json({ success: true, filter: updated });
	} catch (error) {
		console.error("Ошибка редактирования фильтра:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
