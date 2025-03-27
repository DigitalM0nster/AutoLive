// src/app/api/filters/delete-filter/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
	try {
		const { id } = await req.json();

		if (!id) {
			return NextResponse.json({ error: "id обязателен" }, { status: 400 });
		}

		await prisma.filter.delete({
			where: { id: Number(id) },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Ошибка удаления фильтра:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
