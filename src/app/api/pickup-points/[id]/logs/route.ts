import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { PickupPointLogResponse, PickupPointLog } from "@/lib/types";

// Путь: /api/pickup-points/[id]/logs → ID на индексе 3
async function getPickupPointLogsHandler(req: NextRequest) {
	try {
		const pickupPointId = Number(req.nextUrl.pathname.split("/")[3]);
		if (isNaN(pickupPointId)) {
			return NextResponse.json({ error: "Некорректный ID пункта выдачи" }, { status: 400 });
		}

		const point = await prisma.pickupPoint.findUnique({
			where: { id: pickupPointId },
			select: { id: true, name: true, address: true },
		});
		if (!point) {
			return NextResponse.json({ error: "Пункт выдачи не найден" }, { status: 404 });
		}

		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const skip = (page - 1) * limit;
		const action = searchParams.get("action");
		const dateFrom = searchParams.get("dateFrom") || searchParams.get("startDate");
		const dateTo = searchParams.get("dateTo") || searchParams.get("endDate");
		const adminSearch = searchParams.get("adminSearch")?.trim() || "";

		let whereClause: any = { pickupPointId };
		if (action) whereClause.action = action;
		if (dateFrom || dateTo) {
			whereClause.createdAt = {};
			if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
			if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
		}

		const [logs, total] = await Promise.all([
			prisma.pickupPointLog.findMany({
				where: whereClause,
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
			}),
			prisma.pickupPointLog.count({ where: whereClause }),
		]);

		const totalPages = Math.ceil(total / limit);
		let typedLogs: PickupPointLog[] = logs.map((log) => ({
			id: log.id,
			createdAt: log.createdAt,
			action: log.action,
			message: log.message,
			pickupPointId: log.pickupPointId,
			adminSnapshot: log.adminSnapshot as any,
			pickupPointSnapshot: log.pickupPointSnapshot as any,
		}));

		if (adminSearch) {
			const search = adminSearch.toLowerCase();
			typedLogs = typedLogs.filter((log) => {
				const a = log.adminSnapshot as any;
				if (!a || typeof a !== "object") return false;
				const fio = [a.last_name, a.first_name].filter(Boolean).join(" ").toLowerCase();
				return fio.includes(search);
			});
			const filteredTotal = typedLogs.length;
			const filteredTotalPages = Math.ceil(filteredTotal / limit);
			typedLogs = typedLogs.slice(skip, skip + limit);
			return NextResponse.json({
				data: typedLogs,
				total: filteredTotal,
				page,
				totalPages: filteredTotalPages,
			} as PickupPointLogResponse);
		}

		return NextResponse.json({ data: typedLogs, total, page, totalPages } as PickupPointLogResponse);
	} catch (error) {
		console.error("Error fetching pickup point logs:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withPermission(getPickupPointLogsHandler, "view_bookings", ["superadmin", "admin", "manager"]);
