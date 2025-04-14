// src/app/api/departments/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const departments = await prisma.department.findMany({
			select: {
				id: true,
				name: true,
			},
		});
		return NextResponse.json(departments);
	} catch (err) {
		console.error("Ошибка загрузки отделов:", err);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
