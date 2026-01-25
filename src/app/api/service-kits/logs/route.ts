// src/app/api/service-kits/logs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { ServiceKitLogResponse, ServiceKitLog } from "@/lib/types";

// GET /api/service-kits/logs - Получить логи всех комплектов ТО
async function getServiceKitLogsHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const { searchParams } = new URL(req.url);

		// Параметры пагинации
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const skip = (page - 1) * limit;

		// Параметры фильтрации
		const action = searchParams.get("action");
		const serviceKitId = searchParams.get("serviceKitId");
		const dateFrom = searchParams.get("dateFrom");
		const dateTo = searchParams.get("dateTo");

		// Получаем полную информацию о пользователе из базы данных
		const fullUser = await prisma.user.findUnique({
			where: { id: user.id },
			include: {
				department: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!fullUser) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Базовые условия для фильтрации
		let whereClause: any = {};

		// Логика доступа по scope - показываем все логи для комплектов ТО
		// (комплекты ТО не привязаны к отделам, поэтому все видят все логи)
		if (scope === "all") {
			// Суперадмин и админ видит все логи
			// Никаких дополнительных ограничений
		} else if (scope === "department" || scope === "own") {
			// Админы и менеджеры тоже видят все логи комплектов ТО
			// (так как комплекты не привязаны к отделам)
		}

		// Добавляем дополнительные фильтры
		if (action) {
			whereClause.action = action;
		}
		if (serviceKitId) {
			whereClause.serviceKitId = parseInt(serviceKitId);
		}
		if (dateFrom || dateTo) {
			whereClause.createdAt = {};
			if (dateFrom) {
				whereClause.createdAt.gte = new Date(dateFrom);
			}
			if (dateTo) {
				whereClause.createdAt.lte = new Date(dateTo);
			}
		}

		// Получаем логи с пагинацией
		const [logs, total] = await Promise.all([
			prisma.serviceKitLog.findMany({
				where: whereClause,
				orderBy: {
					createdAt: "desc",
				},
				skip,
				take: limit,
			}),
			prisma.serviceKitLog.count({ where: whereClause }),
		]);

		const totalPages = Math.ceil(total / limit);

		// Преобразуем логи в нужный тип (Prisma возвращает JsonValue для snapshots)
		const typedLogs: ServiceKitLog[] = logs.map((log) => ({
			id: log.id,
			createdAt: log.createdAt,
			action: log.action,
			message: log.message,
			serviceKitId: log.serviceKitId,
			adminSnapshot: log.adminSnapshot as any,
			serviceKitSnapshot: log.serviceKitSnapshot as any,
		}));

		const response: ServiceKitLogResponse = {
			data: typedLogs,
			total,
			page,
			totalPages,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error fetching service kit logs:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withPermission(getServiceKitLogsHandler, "view_products_logs", ["superadmin", "admin", "manager"]);
