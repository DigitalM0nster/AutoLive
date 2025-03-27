// src/app/api/filters/delete-filter-value/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
	try {
		const { id } = await req.json();

		if (!id) {
			return NextResponse.json({ error: "id обязателен" }, { status: 400 });
		}

		// Сначала удалим связи у товаров
		await prisma.productFilterValue.deleteMany({
			where: { filterValueId: id },
		});

		// Затем само значение фильтра
		await prisma.filterValue.delete({
			where: { id },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Ошибка удаления значения фильтра:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
