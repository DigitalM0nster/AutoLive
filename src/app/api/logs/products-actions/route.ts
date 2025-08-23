import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { User, Department, Category } from "@/lib/types";

// 📸 Типы для снимков (упрощенные версии основных типов)
type UserSnapshot = Pick<User, "id" | "first_name" | "last_name" | "role"> & {
	department?: Pick<Department, "id" | "name">;
};

type DepartmentSnapshot = Pick<Department, "id" | "name" | "allowedCategories">;

export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1");
			const limit = parseInt(searchParams.get("limit") || "20");
			const actionFilter = searchParams.get("action");

			const [imports, products, bulk] = await Promise.all([
				// ✅ Читаем без include - используем только снимки
				prisma.import_log.findMany({
					where: undefined, // Логи импорта доступны всем авторизованным пользователям
					orderBy: { created_at: "desc" },
				}),
				prisma.product_log.findMany({
					where: undefined, // Логи продуктов доступны всем авторизованным пользователям
					orderBy: { created_at: "desc" },
				}),
				prisma.bulk_action_log.findMany({
					where: undefined, // Логи массовых действий доступны всем авторизованным пользователям
					orderBy: { created_at: "desc" },
				}),
			]);

			// ✅ Получаем ID пользователя из снимка
			const importTimes = new Set(
				imports.map((i) => {
					const userSnapshot = i.user_snapshot as UserSnapshot | null;
					const userId = userSnapshot?.id || i.user_id; // Fallback на старое поле
					return `${userId}|${i.created_at.toISOString().slice(0, 19)}`;
				})
			);

			const filteredProductLogs = products.filter((log) => {
				const userSnapshot = log.user_snapshot as UserSnapshot | null;
				const userId = userSnapshot?.id || log.user_id; // Fallback на старое поле
				const timeKey = `${userId}|${log.created_at.toISOString().slice(0, 19)}`;
				if (log.action === "create" && importTimes.has(timeKey)) return false;
				if (log.action === "bulk") return false;
				return true;
			});

			const unifiedLogs = [
				...imports.map((log) => {
					// ✅ Получаем данные пользователя из снимка или создаем заглушку
					const userSnapshot = log.user_snapshot as UserSnapshot | null;
					const departmentSnapshot = log.department_snapshot as DepartmentSnapshot | null;
					const productsSnapshot = log.products_snapshot as any[] | null;

					const user = userSnapshot || {
						id: log.user_id || 0,
						first_name: "Неизвестно",
						last_name: "",
						role: "unknown",
						department: { name: "Неизвестно" },
					};

					return {
						id: log.id,
						createdAt: log.created_at,
						type: "import" as const,
						message: log.message,
						user: user,
						department: departmentSnapshot || user.department,
						action: "Импорт товаров",
						details: {
							fileName: log.file_name,
							created: log.created,
							updated: log.updated,
							skipped: log.skipped ?? 0,
							imagePolicy: log.image_policy ?? null,
							markupSummary: log.markup_summary ?? null,
							snapshots: productsSnapshot || [],
						},
					};
				}),

				...filteredProductLogs.map((log) => {
					// ✅ Получаем данные из снимков
					const userSnapshot = log.user_snapshot as UserSnapshot | null;
					const departmentSnapshot = log.department_snapshot as DepartmentSnapshot | null;

					const user = userSnapshot || {
						id: log.user_id || 0,
						first_name: "Неизвестно",
						last_name: "",
						role: "unknown",
						department: { name: "Неизвестно" },
					};

					const before = (log.snapshot_before || {}) as Record<string, any>;
					const after = (log.snapshot_after || {}) as Record<string, any>;
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
						createdAt: log.created_at,
						type: "product" as const,
						message: log.message,
						user: user,
						department: departmentSnapshot || user.department,
						action: log.action === "create" ? "Создание" : log.action === "delete" ? "Удаление" : "Редактирование",
						details: log.action === "create" ? { after } : log.action === "delete" ? { before } : { before, after, diff },
					};
				}),

				...bulk.map((log) => {
					// ✅ Получаем данные из снимков
					const userSnapshot = log.user_snapshot as UserSnapshot | null;
					const departmentSnapshot = log.department_snapshot as DepartmentSnapshot | null;
					const productsSnapshot = log.products_snapshot as any[] | null;

					const user = userSnapshot || {
						id: log.user_id || 0,
						first_name: "Неизвестно",
						last_name: "",
						role: "unknown",
						department: { name: "Неизвестно" },
					};

					return {
						id: log.id,
						createdAt: log.created_at,
						type: "bulk" as const,
						message: log.message,
						user: user,
						department: departmentSnapshot || user.department,
						action: "Массовое удаление",
						details: {
							count: log.count,
							snapshots: productsSnapshot || [],
						},
					};
				}),
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
