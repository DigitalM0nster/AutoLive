import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { OrderLogResponse } from "@/lib/types";

// Получение логов конкретного заказа
async function getOrderLogsHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const orderId = parseInt(req.url.split("/").slice(-3, -1)[0]); // Извлекаем orderId из URL
		const { searchParams } = new URL(req.url);

		// Параметры пагинации
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const skip = (page - 1) * limit;

		// Параметры фильтрации
		const action = searchParams.get("action");
		const startDate = searchParams.get("startDate");
		const endDate = searchParams.get("endDate");
		const adminSearch = searchParams.get("adminSearch")?.trim() || "";

		if (isNaN(orderId)) {
			return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
		}

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

		// Базовые условия для проверки доступа к заказу
		let whereClause: any = {};

		// Логика доступа по scope
		if (scope === "all") {
			// Суперадмин видит все
			whereClause = { id: orderId };
		} else if (scope === "department") {
			// Админ видит заказы своего отдела, свободные заказы и свои
			whereClause = {
				id: orderId,
				OR: [
					{ managerId: null }, // Свободные заказы
					{ departmentId: fullUser.departmentId }, // Заказы отдела
					{ managerId: fullUser.id }, // Свои заказы
				],
			};
		} else if (scope === "own") {
			// Менеджер видит свободные заказы и свои
			whereClause = {
				id: orderId,
				OR: [
					{ managerId: null }, // Свободные заказы
					{ managerId: fullUser.id }, // Свои заказы
				],
			};
		}

		// Проверяем права доступа к заказу
		const order = await prisma.order.findFirst({
			where: whereClause,
		});

		if (!order) {
			return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
		}

		// Условия фильтрации логов заказа (отдельная переменная, т.к. whereClause выше — для проверки доступа к заказу)
		const logsWhereClause: any = { orderId: orderId };
		if (action) {
			logsWhereClause.action = action;
		}
		if (startDate || endDate) {
			logsWhereClause.createdAt = {};
			if (startDate) {
				logsWhereClause.createdAt.gte = new Date(startDate);
			}
			if (endDate) {
				logsWhereClause.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
			}
		}

		// Получаем логи заказа с пагинацией
		const [logs, total] = await Promise.all([
			prisma.orderLog.findMany({
				where: logsWhereClause,
				orderBy: {
					createdAt: "desc",
				},
				skip,
				take: limit,
			}),
			prisma.orderLog.count({
				where: logsWhereClause,
			}),
		]);

		// Фильтр по администратору (поиск по ФИО или телефону из adminSnapshot)
		let filteredLogs = logs;
		if (adminSearch) {
			const search = adminSearch.toLowerCase();
			// adminSnapshot — JSON-поле из БД, нужна проверка и приведение типа
			type AdminSnapshot = { last_name?: string; first_name?: string; middle_name?: string; phone?: string };
			filteredLogs = logs.filter((log) => {
				const raw = log.adminSnapshot;
				if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
				const admin = raw as AdminSnapshot;
				const fio = [admin.last_name, admin.first_name, admin.middle_name].filter(Boolean).join(" ").toLowerCase();
				const phone = (admin.phone || "").toLowerCase();
				return fio.includes(search) || phone.includes(search);
			});
		}

		// Пересчитываем total и totalPages после фильтрации по админу
		const filteredTotal = adminSearch ? filteredLogs.length : total;
		const filteredTotalPages = Math.ceil(filteredTotal / limit);
		const paginatedLogs = adminSearch ? filteredLogs.slice(skip, skip + limit) : filteredLogs;

		const response: OrderLogResponse = {
			data: paginatedLogs,
			total: filteredTotal,
			page,
			totalPages: filteredTotalPages,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error fetching order logs:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Экспорт с проверкой разрешений
export const GET = withPermission(getOrderLogsHandler, "view_orders_logs", ["superadmin", "admin", "manager"]);
