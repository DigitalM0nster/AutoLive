import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

function parseJsonField(value: unknown): any {
	if (value == null) return null;
	if (typeof value === "object") return value;
	if (typeof value === "string") {
		try {
			return JSON.parse(value);
		} catch {
			return null;
		}
	}
	return null;
}

export const GET = withPermission(
	async (req: NextRequest) => {
		try {
			const categoryId = Number(req.nextUrl.pathname.split("/")[4]); // /api/categories/[categoryId]/logs
			if (isNaN(categoryId)) {
				return NextResponse.json({ error: "Некорректный ID категории" }, { status: 400 });
			}

			const category = await prisma.category.findUnique({
				where: { id: categoryId },
				select: { id: true, title: true },
			});
			if (!category) {
				return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
			}

			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "20", 10);
			const skip = (page - 1) * limit;
			const action = searchParams.get("action");
			const startDate = searchParams.get("startDate");
			const endDate = searchParams.get("endDate");
			const adminSearch = searchParams.get("adminSearch")?.trim() || "";

			const where: any = { entityType: "category", entityId: categoryId };
			if (startDate || endDate) {
				where.createdAt = {};
				if (startDate) where.createdAt.gte = new Date(startDate);
				if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
			}

			const logs = await prisma.changeLog.findMany({
				where,
				orderBy: { createdAt: "desc" },
			});

			let formattedLogs = logs.map((log) => {
				const snapshotBefore = parseJsonField(log.snapshotBefore);
				const snapshotAfter = parseJsonField(log.snapshotAfter);
				const adminSnapshot = parseJsonField(log.adminSnapshot);
				const actions = parseJsonField(log.actions) || [];

				let determinedActions: string[] = actions;
				if (!Array.isArray(determinedActions) || determinedActions.length === 0) {
					if (snapshotAfter && !snapshotBefore) determinedActions = ["create"];
					else if (snapshotBefore && !snapshotAfter) determinedActions = ["delete"];
					else if (snapshotBefore && snapshotAfter) determinedActions = ["update"];
				}

				return {
					id: log.id,
					createdAt: log.createdAt,
					entityId: log.entityId,
					actions: Array.isArray(determinedActions) ? determinedActions : [String(determinedActions)],
					message: log.message,
					admin: adminSnapshot
						? {
								id: adminSnapshot.id,
								first_name: adminSnapshot.first_name,
								last_name: adminSnapshot.last_name,
								middle_name: adminSnapshot.middle_name,
								phone: adminSnapshot.phone,
								role: adminSnapshot.role,
								department: adminSnapshot.department,
						  }
						: null,
					targetCategory: snapshotAfter || snapshotBefore
						? {
								id: (snapshotAfter || snapshotBefore).id,
								title: (snapshotAfter || snapshotBefore).title,
								image: (snapshotAfter || snapshotBefore).image,
								order: (snapshotAfter || snapshotBefore).order,
						  }
						: null,
					snapshotBefore,
					snapshotAfter,
					adminSnapshot,
				};
			});

			if (action && action !== "all") {
				formattedLogs = formattedLogs.filter((log) => log.actions.includes(action));
			}

			// Фильтр по администратору: ФИО или телефон
			if (adminSearch) {
				const search = adminSearch.toLowerCase();
				formattedLogs = formattedLogs.filter((log) => {
					const a = log.admin;
					if (!a) return false;
					const fio = [a.last_name, a.first_name, a.middle_name].filter(Boolean).join(" ").toLowerCase();
					const phone = (a.phone || "").toLowerCase();
					return fio.includes(search) || phone.includes(search);
				});
			}

			const total = formattedLogs.length;
			const totalPages = Math.ceil(total / limit);
			const paginatedLogs = formattedLogs.slice(skip, skip + limit);

			return NextResponse.json({
				data: paginatedLogs,
				total,
				page,
				totalPages,
			});
		} catch (err) {
			console.error("Error fetching category logs:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_products_logs",
	["superadmin", "admin", "manager"]
);
