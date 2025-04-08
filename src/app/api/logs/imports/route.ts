import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	try {
		const logs = await prisma.importLog.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				user: {
					select: {
						id: true,
						first_name: true,
						last_name: true,
						role: true,
					},
				},
			},
		});

		const result = logs.map((log) => ({
			id: log.id,
			fileName: log.fileName,
			created: log.created,
			updated: log.updated,
			createdAt: log.createdAt,
			user: {
				id: log.user.id,
				fullName: `${log.user.first_name} ${log.user.last_name}`,
				role: log.user.role,
			},
		}));

		return NextResponse.json(result);
	} catch (error) {
		console.error("Ошибка при получении логов импорта:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
