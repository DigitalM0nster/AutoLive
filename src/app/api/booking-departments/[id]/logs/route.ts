import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { BookingDepartmentLogResponse, BookingDepartmentLog } from "@/lib/types";

// Получение логов конкретного адреса (отдела для записей)
async function getBookingDepartmentLogsHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const bookingDepartmentId = Number(req.nextUrl.pathname.split("/")[4]); // /api/booking-departments/[id]/logs
		if (isNaN(bookingDepartmentId)) {
			return NextResponse.json({ error: "Некорректный ID адреса" }, { status: 400 });
		}

		const bookingDepartment = await prisma.bookingDepartment.findUnique({
			where: { id: bookingDepartmentId },
			select: { id: true, name: true, address: true },
		});
		if (!bookingDepartment) {
			return NextResponse.json({ error: "Адрес не найден" }, { status: 404 });
		}

		const { searchParams } = new URL(req.url);

		// Параметры пагинации
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const skip = (page - 1) * limit;

		// Параметры фильтрации
		const action = searchParams.get("action");
		const dateFrom = searchParams.get("dateFrom") || searchParams.get("startDate");
		const dateTo = searchParams.get("dateTo") || searchParams.get("endDate");
		const adminSearch = searchParams.get("adminSearch")?.trim() || "";

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
		let whereClause: any = {
			bookingDepartmentId,
		};

		// Добавляем дополнительные фильтры
		if (action) {
			whereClause.action = action;
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
		let typedLogs: BookingDepartmentLog[] = logs.map((log) => ({
			id: log.id,
			createdAt: log.createdAt,
			action: log.action,
			message: log.message,
			bookingDepartmentId: log.bookingDepartmentId,
			adminSnapshot: log.adminSnapshot as any,
			bookingDepartmentSnapshot: log.bookingDepartmentSnapshot as any,
		}));

		// Фильтрация по поиску администратора (применяется после получения данных, т.к. adminSnapshot - JSON)
		if (adminSearch) {
			const search = adminSearch.toLowerCase();
			typedLogs = typedLogs.filter((log) => {
				const a = log.adminSnapshot;
				if (!a || typeof a !== "object") return false;
				const fio = [a.last_name, a.first_name].filter(Boolean).join(" ").toLowerCase();
				return fio.includes(search);
			});
			// Пересчитываем total после фильтрации
			const filteredTotal = typedLogs.length;
			const filteredTotalPages = Math.ceil(filteredTotal / limit);
			// Применяем пагинацию к отфильтрованным результатам
			const startIndex = skip;
			const endIndex = startIndex + limit;
			typedLogs = typedLogs.slice(startIndex, endIndex);

			const response: BookingDepartmentLogResponse = {
				data: typedLogs,
				total: filteredTotal,
				page,
				totalPages: filteredTotalPages,
			};

			return NextResponse.json(response);
		}

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
