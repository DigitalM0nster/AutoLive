import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { BookingDepartmentLogResponse, BookingDepartmentLog } from "@/lib/types";

// Получение логов всех адресов (отделов для записей)
async function getBookingDepartmentLogsHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const { searchParams } = new URL(req.url);

		// Параметры пагинации
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const skip = (page - 1) * limit;

		// Параметры фильтрации
		const action = searchParams.get("action");
		const bookingDepartmentId = searchParams.get("bookingDepartmentId");
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

		// Все пользователи с правами видят все логи адресов
		// Можно добавить фильтрацию по ролям, если нужно

		// Добавляем дополнительные фильтры
		if (action) {
			whereClause.action = action;
		}
		if (bookingDepartmentId) {
			whereClause.bookingDepartmentId = parseInt(bookingDepartmentId);
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
			prisma.bookingDepartmentLog.findMany({
				where: whereClause,
				orderBy: {
					createdAt: "desc",
				},
				skip,
				take: limit,
			}),
			prisma.bookingDepartmentLog.count({ where: whereClause }),
		]);

		const totalPages = Math.ceil(total / limit);

		// Преобразуем логи в нужный тип (Prisma возвращает JsonValue для snapshots)
		const typedLogs: BookingDepartmentLog[] = logs.map((log) => ({
			id: log.id,
			createdAt: log.createdAt,
			action: log.action,
			message: log.message,
			bookingDepartmentId: log.bookingDepartmentId,
			adminSnapshot: log.adminSnapshot as any,
			bookingDepartmentSnapshot: log.bookingDepartmentSnapshot as any,
		}));

		const response: BookingDepartmentLogResponse = {
			data: typedLogs,
			total,
			page,
			totalPages,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error fetching booking department logs:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Экспорт с проверкой разрешений
export const GET = withPermission(getBookingDepartmentLogsHandler, "view_bookings", ["superadmin", "admin", "manager"]);
