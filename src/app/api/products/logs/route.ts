import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

interface ExtendedRequestContext {
	user: any;
	scope: string;
}

export const GET = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "10", 10);
			const skip = (page - 1) * limit;

			// Строим условия фильтрации для product_log
			// В общем списке показываем только логи НЕ связанные с импортом
			const where: any = {
				import_log_id: null, // Исключаем логи при импорте
			};

			// Фильтр по конкретному продукту
			const targetProductId = searchParams.get("targetProductId");
			if (targetProductId) {
				// Фильтруем логи, где targetProductId присутствует в snapshotBefore или snapshotAfter
				// Это будет обработано после получения данных
			}

			// Фильтр по действию
			const action = searchParams.get("action");
			if (action && action !== "all") {
				// Определяем действие на основе данных в снапшотах
				// Это будет обработано после получения данных
			}

			// Фильтр по дате
			const startDate = searchParams.get("startDate");
			const endDate = searchParams.get("endDate");
			if (startDate || endDate) {
				where.created_at = {};
				if (startDate) {
					where.created_at.gte = new Date(startDate);
				}
				if (endDate) {
					where.created_at.lte = new Date(endDate + "T23:59:59.999Z");
				}
			}

			// Получаем все логи из таблицы product_log (без пагинации для правильной фильтрации)
			const logs = await prisma.product_log.findMany({
				where,
				orderBy: {
					created_at: "desc",
				},
			});

			// Получаем общее количество логов для базового подсчета
			const baseTotal = await prisma.product_log.count({
				where,
			});

			// Преобразуем логи в нужный формат
			let formattedLogs = logs.map((log) => {
				const userSnapshot = log.user_snapshot as any;
				const departmentSnapshot = log.department_snapshot as any;
				const snapshotBefore = log.snapshot_before ? JSON.parse(log.snapshot_before) : null;
				const snapshotAfter = log.snapshot_after ? JSON.parse(log.snapshot_after) : null;

				// Отладка для первого лога
				if (log.id === logs[0]?.id) {
					console.log("API logs - snapshotBefore:", snapshotBefore);
					console.log("API logs - snapshotBefore.department:", snapshotBefore?.department);
				}

				// Определяем действие на основе action из product_log
				const determinedAction = log.action;

				return {
					id: log.id,
					createdAt: log.created_at,
					action: determinedAction,
					message: log.message,
					admin: userSnapshot
						? {
								id: userSnapshot.id,
								first_name: userSnapshot.first_name,
								last_name: userSnapshot.last_name,
								middle_name: userSnapshot.middle_name,
								phone: userSnapshot.phone,
								role: userSnapshot.role,
								department: userSnapshot.department,
						  }
						: null,
					targetProduct: snapshotBefore
						? {
								id: snapshotBefore.id,
								title: snapshotBefore.title,
								sku: snapshotBefore.sku,
								brand: snapshotBefore.brand,
								price: snapshotBefore.price,
								category: snapshotBefore.category,
								description: snapshotBefore.description,
								department: snapshotBefore.department,
						  }
						: null,
					department: departmentSnapshot
						? {
								id: departmentSnapshot.id,
								name: departmentSnapshot.name,
						  }
						: null,
					snapshotBefore,
					snapshotAfter,
					userSnapshot,
					departmentSnapshot,
					importLogId: log.import_log_id,
				};
			});

			// Фильтруем по действию если указан
			if (action && action !== "all") {
				formattedLogs = formattedLogs.filter((log) => log.action === action);
			}

			// Фильтрация по поиску администратора
			const adminSearch = searchParams.get("adminSearch");
			if (adminSearch && adminSearch.trim() !== "") {
				const searchTerm = adminSearch.trim().toLowerCase();
				formattedLogs = formattedLogs.filter((log) => {
					if (!log.admin) return false;

					// Поиск по ID (если введено число)
					if (!isNaN(Number(searchTerm)) && log.admin.id === parseInt(searchTerm)) {
						return true;
					}

					// Поиск по телефону
					if (log.admin.phone && log.admin.phone.toLowerCase().includes(searchTerm)) {
						return true;
					}

					// Поиск по ФИО
					const adminName = `${log.admin.last_name || ""} ${log.admin.first_name || ""} ${log.admin.middle_name || ""}`.trim().toLowerCase();
					if (adminName.includes(searchTerm)) {
						return true;
					}

					return false;
				});
			}

			// Фильтрация по конкретному продукту (targetProductId)
			if (targetProductId) {
				const targetProductIdNum = parseInt(targetProductId);
				formattedLogs = formattedLogs.filter((log) => {
					// Проверяем targetProduct (snapshotAfter для созданных/обновленных продуктов)
					if (log.targetProduct && log.targetProduct.id === targetProductIdNum) {
						return true;
					}

					// Проверяем snapshotBefore для удаленных продуктов
					if (log.snapshotBefore && log.snapshotBefore.id === targetProductIdNum) {
						return true;
					}

					return false;
				});
			}

			// Фильтрация по поиску целевого продукта
			const targetProductSearch = searchParams.get("targetProductSearch");
			if (targetProductSearch && targetProductSearch.trim() !== "") {
				const searchTerm = targetProductSearch.trim().toLowerCase();
				formattedLogs = formattedLogs.filter((log) => {
					// Проверяем targetProduct (snapshotAfter для созданных/обновленных продуктов)
					if (log.targetProduct) {
						const targetProductName = log.targetProduct.title?.toLowerCase() || "";
						const targetProductSku = log.targetProduct.sku?.toLowerCase() || "";
						const targetProductBrand = log.targetProduct.brand?.toLowerCase() || "";

						if (targetProductName.includes(searchTerm) || targetProductSku.includes(searchTerm) || targetProductBrand.includes(searchTerm)) {
							return true;
						}
					}

					// Проверяем snapshotBefore для удаленных продуктов
					if (log.snapshotBefore) {
						const snapshotBeforeName = log.snapshotBefore.title?.toLowerCase() || "";
						const snapshotBeforeSku = log.snapshotBefore.sku?.toLowerCase() || "";
						const snapshotBeforeBrand = log.snapshotBefore.brand?.toLowerCase() || "";

						if (snapshotBeforeName.includes(searchTerm) || snapshotBeforeSku.includes(searchTerm) || snapshotBeforeBrand.includes(searchTerm)) {
							return true;
						}
					}

					return false;
				});
			}

			// Получаем общее количество отфильтрованных записей
			const total = formattedLogs.length;

			// Применяем пагинацию к отфильтрованным данным
			const paginatedLogs = formattedLogs.slice(skip, skip + limit);

			const totalPages = Math.ceil(total / limit);

			return NextResponse.json({
				data: paginatedLogs,
				total,
				totalPages,
				currentPage: page,
			});
		} catch (err) {
			console.error("Ошибка при получении логов продуктов:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_products_logs",
	["superadmin", "admin", "manager"]
);

// ✅ Удаление всех логов продуктов
export const DELETE = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			// Получаем параметры из запроса
			const { searchParams } = new URL(req.url);
			const confirm = searchParams.get("confirm");

			// Проверяем подтверждение удаления
			if (confirm !== "true") {
				return NextResponse.json({ error: "Для удаления всех логов продуктов необходимо подтверждение (confirm=true)" }, { status: 400 });
			}

			// Получаем количество логов продуктов перед удалением
			const logsCount = await prisma.changeLog.count({
				where: {
					entityType: "product",
				},
			});

			// Удаляем все логи продуктов
			const deleteResult = await prisma.changeLog.deleteMany({
				where: {
					entityType: "product",
				},
			});

			console.log(`🗑️ Удалено ${deleteResult.count} логов продуктов администратором ${user.id}`);

			return NextResponse.json({
				success: true,
				message: `Успешно удалено ${deleteResult.count} логов продуктов`,
				deletedCount: deleteResult.count,
				totalBeforeDeletion: logsCount,
			});
		} catch (error) {
			console.error("❌ Ошибка при удалении логов продуктов:", error);
			return NextResponse.json({ error: "Ошибка при удалении логов продуктов" }, { status: 500 });
		}
	},
	"view_products_logs", // ✅ Разрешение на управление логами продуктов
	["superadmin"] // ✅ Только суперадмин может удалять все логи
);
