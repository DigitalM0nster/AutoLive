// src/app/api/logs/imports/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		const logs = await prisma.importLog.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				user: {
					select: {
						first_name: true,
						last_name: true,
						role: true,
						department: {
							select: {
								name: true,
							},
						},
					},
				},
			},
		});

		return NextResponse.json(logs);
	} catch (error) {
		console.error("Ошибка при получении логов импорта:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
