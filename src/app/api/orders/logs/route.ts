import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { OrderLogResponse } from "@/lib/types";

// Получение логов всех заказов
async function getOrderLogsHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const { searchParams } = new URL(req.url);

		// Параметры пагинации
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const skip = (page - 1) * limit;

		// Параметры фильтрации
		const action = searchParams.get("action");
		const orderId = searchParams.get("orderId");
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

		// Базовые условия для фильтрации по ролям
		let whereClause: any = {};

		// Логика доступа по scope - показываем только логи заказов, к которым есть доступ
		if (scope === "all") {
			// Суперадмин видит все логи
			// Никаких дополнительных ограничений
		} else if (scope === "department") {
			// Админ видит логи заказов:
			// 1. Заказы без назначенного менеджера (свободные)
			// 2. Заказы своего отдела
			// 3. Заказы, которые он сам выполняет
			whereClause = {
				order: {
					OR: [
						// Свободные заказы
						{ managerId: null },
						// Заказы своего отдела
						{ departmentId: fullUser.departmentId },
						// Заказы, которые админ сам выполняет
						{ managerId: fullUser.id },
					],
				},
			};
		} else if (scope === "own") {
			// Менеджер видит логи заказов:
			// 1. Заказы без назначенного менеджера (свободные)
			// 2. Заказы, которые он сам выполняет
			whereClause = {
				order: {
					OR: [
						// Свободные заказы
						{ managerId: null },
						// Заказы, которые менеджер сам выполняет
						{ managerId: fullUser.id },
					],
				},
			};
		}

		// Добавляем дополнительные фильтры
		if (action) {
			whereClause.action = action;
		}
		if (orderId) {
			whereClause.orderId = parseInt(orderId);
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
			prisma.orderLog.findMany({
				where: whereClause,
				orderBy: {
					createdAt: "desc",
				},
				skip,
				take: limit,
			}),
			prisma.orderLog.count({
				where: whereClause,
			}),
		]);

		const totalPages = Math.ceil(total / limit);

		const response: OrderLogResponse = {
			data: logs,
			total,
			page,
			totalPages,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error fetching order logs:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Экспорт с проверкой разрешений
export const GET = withPermission(getOrderLogsHandler, "view_orders_logs", ["superadmin", "admin", "manager"]);
