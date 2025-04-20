import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { Role, Scope } from "@/lib/rolesConfig";

export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1");
			const limit = parseInt(searchParams.get("limit") || "20");
			const actionFilter = searchParams.get("action");

			const [imports, products, bulk] = await Promise.all([
				prisma.importLog.findMany({
					where: scope === "department" ? { user: { departmentId: user.departmentId } } : undefined,
					include: {
						user: {
							select: {
								first_name: true,
								last_name: true,
								role: true,
								department: { select: { name: true } },
							},
						},
					},
				}),
				prisma.productLog.findMany({
					where: scope === "department" ? { departmentId: user.departmentId } : undefined,
					include: {
						user: {
							select: {
								id: true,
								first_name: true,
								last_name: true,
								role: true,
								department: { select: { name: true } },
							},
						},
						department: true,
					},
				}),
				prisma.bulkActionLog.findMany({
					where: scope === "department" ? { departmentId: user.departmentId } : undefined,
					include: {
						user: {
							select: {
								first_name: true,
								last_name: true,
								role: true,
								department: { select: { name: true } },
							},
						},
						department: true,
					},
				}),
			]);

			const importTimes = new Set(imports.map((i) => `${i.userId}|${i.createdAt.toISOString().slice(0, 19)}`));

			const filteredProductLogs = products.filter((log) => {
				const timeKey = `${log.user.id}|${log.createdAt.toISOString().slice(0, 19)}`;
				if (log.action === "create" && importTimes.has(timeKey)) return false;
				if (log.action === "bulk") return false;
				return true;
			});

			const unifiedLogs = [
				...imports.map((log) => ({
					id: log.id,
					createdAt: log.createdAt,
					type: "import" as const,
					message: log.message,
					user: log.user,
					department: log.user.department,
					action: "Импорт товаров",
					details: {
						fileName: log.fileName,
						created: log.created,
						updated: log.updated,
						skipped: (log as any).skipped ?? 0,
						imagePolicy: (log as any).imagePolicy ?? null,
						markupSummary: (log as any).markupSummary ?? null,
						snapshots: log.snapshots ?? [],
					},
				})),

				...filteredProductLogs.map((log) => {
					const before = (log.snapshotBefore || {}) as Record<string, any>;
					const after = (log.snapshotAfter || {}) as Record<string, any>;
					const diff = [];

					if (log.action === "update") {
						for (const key in before) {
							if (before[key] !== after[key]) {
								diff.push({ key, before: before[key], after: after[key] });
							}
						}
					}

					return {
						id: log.id,
						createdAt: log.createdAt,
						type: "product" as const,
						message: log.message,
						user: log.user,
						department: log.department,
						action: log.action === "create" ? "Создание" : log.action === "delete" ? "Удаление" : "Редактирование",
						details: log.action === "create" ? { after } : log.action === "delete" ? { before } : { before, after, diff },
					};
				}),

				...bulk.map((log) => ({
					id: log.id,
					createdAt: log.createdAt,
					type: "bulk" as const,
					message: log.message,
					user: log.user,
					department: log.department,
					action: "Массовое удаление",
					details: {
						count: log.count,
						snapshots: log.snapshots ?? [],
					},
				})),
			].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

			const filteredLogs = actionFilter ? unifiedLogs.filter((log) => log.action === actionFilter) : unifiedLogs;
			const total = filteredLogs.length;
			const paginated = filteredLogs.slice((page - 1) * limit, page * limit);

			return NextResponse.json({
				data: paginated,
				total,
				page,
				totalPages: Math.ceil(total / limit),
			});
		} catch (error) {
			console.error("❌ Ошибка при получении unified-логов:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_products_logs",
	["admin", "superadmin"]
);
