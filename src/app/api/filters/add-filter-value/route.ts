// src/app/api/filters/add-filter-value/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
	try {
		const { filterId, value } = await req.json();

		if (!filterId || !value) {
			return NextResponse.json({ error: "filterId и value обязательны" }, { status: 400 });
		}

		const newValue = await prisma.filterValue.create({
			data: {
				value,
				filterId: Number(filterId),
			},
		});

		return NextResponse.json({ success: true, value: newValue });
	} catch (error) {
		console.error("Ошибка добавления значения:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
