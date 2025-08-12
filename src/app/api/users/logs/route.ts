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

			// Строим условия фильтрации
			const where: any = {
				entityType: "user", // Только логи пользователей
			};

			// Фильтр по конкретному пользователю
			const targetUserId = searchParams.get("targetUserId");
			if (targetUserId) {
				// Фильтруем логи, где targetUserId присутствует в snapshotBefore или snapshotAfter
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
				where.createdAt = {};
				if (startDate) {
					where.createdAt.gte = new Date(startDate);
				}
				if (endDate) {
					where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
				}
			}

			// Получаем все логи из таблицы ChangeLog (без пагинации для правильной фильтрации)
			const logs = await prisma.changeLog.findMany({
				where,
				orderBy: {
					createdAt: "desc",
				},
			});

			// Получаем общее количество логов для базового подсчета
			const baseTotal = await prisma.changeLog.count({
				where,
			});

			// Преобразуем логи в нужный формат
			let formattedLogs = logs.map((log) => {
				// Парсим JSON данные
				const snapshotBefore = log.snapshotBefore ? JSON.parse(log.snapshotBefore as string) : null;
				const snapshotAfter = log.snapshotAfter ? JSON.parse(log.snapshotAfter as string) : null;
				const adminSnapshot = log.adminSnapshot ? JSON.parse(log.adminSnapshot as string) : null;
				const actions = log.actions ? JSON.parse(log.actions as string) : [];

				// Если actions не указаны в базе данных, определяем их на основе данных
				let determinedActions: string[] = actions;
				if (!actions || actions.length === 0) {
					// Если есть snapshotAfter, но нет snapshotBefore - это создание
					if (snapshotAfter && !snapshotBefore) {
						determinedActions = ["create"];
					}
					// Если есть snapshotBefore, но нет snapshotAfter - это удаление
					else if (snapshotBefore && !snapshotAfter) {
						determinedActions = ["delete"];
					}
					// Если есть и snapshotBefore, и snapshotAfter - это обновление
					else if (snapshotBefore && snapshotAfter) {
						// Проверяем, действительно ли это обновление (данные изменились)
						// или это создание с автоматически полученным snapshotBefore
						const isActuallyUpdate = JSON.stringify(snapshotBefore) !== JSON.stringify(snapshotAfter);
						if (isActuallyUpdate) {
							determinedActions = ["update"];
						} else {
							// Если данные одинаковые, это скорее всего создание
							determinedActions = ["create"];
						}
					}
				} else {
					// Если actions указаны в базе данных, используем их
					determinedActions = actions;
				}

				return {
					id: log.id,
					createdAt: log.createdAt,
					actions: determinedActions, // Используем определенные действия
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
					targetUser: snapshotAfter
						? {
								id: snapshotAfter.id,
								first_name: snapshotAfter.first_name,
								last_name: snapshotAfter.last_name,
								middle_name: snapshotAfter.middle_name,
								phone: snapshotAfter.phone,
								role: snapshotAfter.role,
								department: snapshotAfter.department,
								orders: snapshotAfter.orders,
						  }
						: null,
					snapshotBefore,
					snapshotAfter,
					adminSnapshot,
				};
			});

			// Фильтруем по действию если указан
			if (action && action !== "all") {
				formattedLogs = formattedLogs.filter((log) => log.actions.includes(action));
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

			// Фильтрация по конкретному пользователю (targetUserId)
			if (targetUserId) {
				const targetUserIdNum = parseInt(targetUserId);
				formattedLogs = formattedLogs.filter((log) => {
					// Проверяем targetUser (snapshotAfter для созданных/обновленных пользователей)
					if (log.targetUser && log.targetUser.id === targetUserIdNum) {
						return true;
					}

					// Проверяем snapshotBefore для удаленных пользователей
					if (log.snapshotBefore && log.snapshotBefore.id === targetUserIdNum) {
						return true;
					}

					return false;
				});
			}

			// Фильтрация по поиску целевого пользователя
			const targetUserSearch = searchParams.get("targetUserSearch");
			if (targetUserSearch && targetUserSearch.trim() !== "") {
				const searchTerm = targetUserSearch.trim().toLowerCase();
				formattedLogs = formattedLogs.filter((log) => {
					// Проверяем targetUser (snapshotAfter для созданных/обновленных пользователей)
					if (log.targetUser) {
						const targetUserName = `${log.targetUser.last_name || ""} ${log.targetUser.first_name || ""} ${log.targetUser.middle_name || ""}`.trim().toLowerCase();
						if (targetUserName.includes(searchTerm)) return true;
					}

					// Проверяем snapshotBefore для удаленных пользователей
					if (log.snapshotBefore) {
						const snapshotBeforeName = `${log.snapshotBefore.last_name || ""} ${log.snapshotBefore.first_name || ""} ${log.snapshotBefore.middle_name || ""}`
							.trim()
							.toLowerCase();
						if (snapshotBeforeName.includes(searchTerm)) return true;
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
			console.error("Ошибка при получении логов пользователей:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_users_logs",
	["superadmin", "admin", "manager"]
);

// ✅ Удаление всех логов пользователей
export const DELETE = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			// Получаем параметры из запроса
			const { searchParams } = new URL(req.url);
			const confirm = searchParams.get("confirm");

			// Проверяем подтверждение удаления
			if (confirm !== "true") {
				return NextResponse.json({ error: "Для удаления всех логов пользователей необходимо подтверждение (confirm=true)" }, { status: 400 });
			}

			// Получаем количество логов пользователей перед удалением
			const logsCount = await prisma.changeLog.count({
				where: {
					entityType: "user",
				},
			});

			// Удаляем все логи пользователей
			const deleteResult = await prisma.changeLog.deleteMany({
				where: {
					entityType: "user",
				},
			});

			console.log(`🗑️ Удалено ${deleteResult.count} логов пользователей администратором ${user.id}`);

			return NextResponse.json({
				success: true,
				message: `Успешно удалено ${deleteResult.count} логов пользователей`,
				deletedCount: deleteResult.count,
				totalBeforeDeletion: logsCount,
			});
		} catch (error) {
			console.error("❌ Ошибка при удалении логов пользователей:", error);
			return NextResponse.json({ error: "Ошибка при удалении логов пользователей" }, { status: 500 });
		}
	},
	"manage_users_logs", // ✅ Разрешение на управление логами пользователей
	["superadmin"] // ✅ Только суперадмин может удалять все логи
);
