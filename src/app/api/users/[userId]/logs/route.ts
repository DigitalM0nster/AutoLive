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
			// Получаем userId из URL
			const userId = Number(req.nextUrl.pathname.split("/")[3]); // /api/users/[userId]/logs

			if (isNaN(userId)) {
				return NextResponse.json({ error: "Некорректный ID пользователя" }, { status: 400 });
			}

			// Проверяем существование пользователя
			const targetUser = await prisma.user.findUnique({
				where: { id: userId },
				select: { id: true, phone: true, first_name: true, last_name: true },
			});

			if (!targetUser) {
				return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
			}

			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "10", 10);
			const skip = (page - 1) * limit;

			// Строим условия фильтрации для логов конкретного пользователя
			const where: any = {
				entityType: "user", // Только логи пользователей
			};

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

			// Получаем все логи пользователей из таблицы ChangeLog (без пагинации для правильной фильтрации)
			const logs = await prisma.changeLog.findMany({
				where,
				orderBy: {
					createdAt: "desc",
				},
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
					action: determinedActions[0] || "update", // Берем первое действие для совместимости
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

			// Сначала фильтруем по конкретному пользователю (userId из URL)
			formattedLogs = formattedLogs.filter((log) => {
				// Проверяем targetUser (snapshotAfter для созданных/обновленных пользователей)
				if (log.targetUser && log.targetUser.id === userId) {
					return true;
				}

				// Проверяем snapshotBefore для удаленных пользователей
				if (log.snapshotBefore && log.snapshotBefore.id === userId) {
					return true;
				}

				return false;
			});

			// Затем фильтруем по действию если указан
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
				targetUser: {
					id: targetUser.id,
					phone: targetUser.phone,
					first_name: targetUser.first_name,
					last_name: targetUser.last_name,
				},
			});
		} catch (err) {
			console.error("Ошибка при получении логов пользователя:", err);
			return NextResponse.json(
				{
					error: "Ошибка сервера при получении логов пользователя",
					details: err instanceof Error ? err.message : "Неизвестная ошибка",
				},
				{ status: 500 }
			);
		}
	},
	"view_users_logs", // ✅ Разрешение на просмотр логов пользователей
	["superadmin", "admin", "manager"]
);
