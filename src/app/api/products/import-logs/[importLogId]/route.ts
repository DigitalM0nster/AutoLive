import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

interface ExtendedRequestContext {
	user: {
		id: number;
		role: string;
		departmentId: number | null;
	};
	scope: string;
}

export const GET = withPermission(async (req: NextRequest, { user }: ExtendedRequestContext) => {
	try {
		// Получаем importLogId из URL
		const importLogId = Number(req.nextUrl.pathname.split("/")[4]); // /api/products/import-logs/[importLogId]

		if (isNaN(importLogId)) {
			return NextResponse.json({ error: "Некорректный ID лога импорта" }, { status: 400 });
		}

		// Получаем лог импорта
		const importLog = await prisma.import_log.findUnique({
			where: { id: importLogId },
		});

		if (!importLog) {
			return NextResponse.json({ error: "Лог импорта не найден" }, { status: 404 });
		}

		// Получаем статистику по логам продуктов для этого импорта
		const productLogsStats = await prisma.product_log.groupBy({
			by: ["action"],
			where: {
				importLogId: importLogId,
			},
			_count: {
				action: true,
			},
		});

		// Подсчитываем успешные и ошибочные операции
		const successCount = productLogsStats.find((stat) => stat.action === "create" || stat.action === "update")?._count.action || 0;
		const errorCount = productLogsStats.find((stat) => stat.action === "error")?._count.action || 0;

		// Парсим снимки данных
		const userSnapshot = importLog.userSnapshot as any;
		const departmentSnapshot = importLog.departmentSnapshot as any;

		// Формируем ответ
		const response = {
			id: importLog.id,
			fileName: importLog.fileName,
			totalRows: importLog.count,
			processedRows: importLog.created + importLog.updated + importLog.skipped,
			successRows: importLog.created + importLog.updated,
			errorRows: errorCount,
			status: "completed", // В текущей схеме нет поля status, считаем что если запись есть - то завершено
			createdAt: importLog.createdAt,
			completedAt: importLog.createdAt, // Используем createdAt как completedAt
			errorMessage: importLog.message,
			user: userSnapshot,
			department: departmentSnapshot,
			settings: {
				imagePolicy: importLog.imagePolicy,
				markupSummary: importLog.markupSummary,
			},
			stats: {
				created: importLog.created,
				updated: importLog.updated,
				skipped: importLog.skipped,
				total: importLog.count,
			},
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Ошибка при получении лога импорта:", error);
		return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
	}
}, "edit_products");
