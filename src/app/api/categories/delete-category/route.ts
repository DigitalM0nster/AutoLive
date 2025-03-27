// src/app/api/categories/delete-category/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
	try {
		const { id } = await req.json();

		if (!id) {
			return NextResponse.json({ error: "id обязателен" }, { status: 400 });
		}

		await prisma.category.delete({ where: { id } });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Ошибка удаления категории:", error);
		return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
	}
}
