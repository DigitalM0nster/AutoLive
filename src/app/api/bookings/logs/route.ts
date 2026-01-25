import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { BookingLogResponse, BookingLog } from "@/lib/types";
import { withDbRetry } from "@/lib/utils";

// Получение логов всех записей
async function getBookingLogsHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const { searchParams } = new URL(req.url);

		// Параметры пагинации
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const skip = (page - 1) * limit;

		// Параметры фильтрации
		const action = searchParams.get("action");
		const bookingId = searchParams.get("bookingId");
		const dateFrom = searchParams.get("dateFrom");
		const dateTo = searchParams.get("dateTo");

		// Получаем полную информацию о пользователе из базы данных
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const fullUser = await withDbRetry(async () => {
			return await prisma.user.findUnique({
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
		});

		if (!fullUser) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Базовые условия для фильтрации по ролям
		let whereClause: any = {};

		// Логика доступа по scope - показываем только логи записей, к которым есть доступ
		if (scope === "all") {
			// Суперадмин видит все логи
			// Никаких дополнительных ограничений
		} else if (scope === "department") {
			// Админ видит логи записей своего отдела
			whereClause = {
				booking: {
					bookingDepartment: {
						// Для админов можно добавить фильтрацию по отделу, если нужно
						// Пока показываем все логи записей
					},
				},
			};
		} else if (scope === "own") {
			// Менеджер видит логи записей, где он назначен менеджером
			whereClause = {
				booking: {
					managerId: fullUser.id,
				},
			};
		}

		// Добавляем дополнительные фильтры
		if (action) {
			whereClause.action = action;
		}
		if (bookingId) {
			whereClause.bookingId = parseInt(bookingId);
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
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const [logs, total] = await withDbRetry(async () => {
			return await Promise.all([
				prisma.bookingLog.findMany({
					where: whereClause,
					orderBy: {
						createdAt: "desc",
					},
					skip,
					take: limit,
				}),
				prisma.bookingLog.count({ where: whereClause }),
			]);
		});

		const totalPages = Math.ceil(total / limit);

		// Преобразуем логи в нужный тип (Prisma возвращает JsonValue для snapshots)
		const typedLogs: BookingLog[] = logs.map((log) => ({
			id: log.id,
			createdAt: log.createdAt,
			action: log.action,
			message: log.message,
			bookingId: log.bookingId,
			adminSnapshot: log.adminSnapshot as any,
			bookingSnapshot: log.bookingSnapshot as any,
			managerSnapshot: log.managerSnapshot as any,
			departmentSnapshot: log.departmentSnapshot as any,
		}));

		const response: BookingLogResponse = {
			data: typedLogs,
			total,
			page,
			totalPages,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error fetching booking logs:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Экспорт с проверкой разрешений
export const GET = withPermission(getBookingLogsHandler, "view_bookings", ["superadmin", "admin", "manager"]);
