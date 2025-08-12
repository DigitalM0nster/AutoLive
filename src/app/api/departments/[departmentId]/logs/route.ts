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
			// Получаем departmentId из URL
			const departmentId = Number(req.nextUrl.pathname.split("/")[3]); // /api/departments/[departmentId]/logs

			if (isNaN(departmentId)) {
				return NextResponse.json({ error: "Некорректный ID отдела" }, { status: 400 });
			}

			// Проверяем существование отдела
			const targetDepartment = await prisma.department.findUnique({
				where: { id: departmentId },
				select: { id: true, name: true },
			});

			if (!targetDepartment) {
				return NextResponse.json({ error: "Отдел не найден" }, { status: 404 });
			}

			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "10", 10);
			const skip = (page - 1) * limit;

			// Строим условия фильтрации для логов отделов
			const where: any = {
				entityType: "department", // Только логи отделов
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

			// Получаем все логи отделов из таблицы ChangeLog (без пагинации для правильной фильтрации)
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
						determinedActions = ["create_department"];
					}
					// Если есть snapshotBefore, но нет snapshotAfter - это удаление
					else if (snapshotBefore && !snapshotAfter) {
						determinedActions = ["delete_department"];
					}
					// Если есть и snapshotBefore, и snapshotAfter - это обновление
					else if (snapshotBefore && snapshotAfter) {
						// Проверяем, действительно ли это обновление (данные изменились)
						// или это создание с автоматически полученным snapshotBefore
						const isActuallyUpdate = JSON.stringify(snapshotBefore) !== JSON.stringify(snapshotAfter);
						if (isActuallyUpdate) {
							// Определяем конкретные типы изменений
							const updateActions: string[] = [];

							// Проверяем изменение названия
							if (snapshotBefore.name !== snapshotAfter.name) {
								updateActions.push("change_name");
							}

							// Проверяем изменение категорий
							const beforeCategories = snapshotBefore.allowedCategories?.map((c: any) => c.category.id).sort() || [];
							const afterCategories = snapshotAfter.allowedCategories?.map((c: any) => c.category.id).sort() || [];
							if (JSON.stringify(beforeCategories) !== JSON.stringify(afterCategories)) {
								updateActions.push("change_categories");
							}

							// Проверяем изменение пользователей
							const beforeUsers = snapshotBefore.users?.map((u: any) => u.id).sort() || [];
							const afterUsers = snapshotAfter.users?.map((u: any) => u.id).sort() || [];
							if (JSON.stringify(beforeUsers) !== JSON.stringify(afterUsers)) {
								// Определяем, какие пользователи добавлены/удалены
								const addedUsers = afterUsers.filter((id: number) => !beforeUsers.includes(id));
								const removedUsers = beforeUsers.filter((id: number) => !afterUsers.includes(id));

								if (addedUsers.length > 0) {
									updateActions.push("add_employees");
								}
								if (removedUsers.length > 0) {
									updateActions.push("remove_employees");
								}
							}

							determinedActions = updateActions.length > 0 ? updateActions : ["update"];
						} else {
							// Если данные одинаковые, это скорее всего создание
							determinedActions = ["create_department"];
						}
					}
				} else {
					// Если actions указаны в базе данных, используем их
					determinedActions = actions;
				}

				// Логируем определенные действия для отладки
				console.log(`🔍 Лог ${log.id}: определены действия:`, determinedActions);

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
					targetDepartment: snapshotAfter
						? {
								id: snapshotAfter.id,
								name: snapshotAfter.name,
								allowedCategories: snapshotAfter.allowedCategories,
								users: snapshotAfter.users,
						  }
						: snapshotBefore
						? {
								id: snapshotBefore.id,
								name: snapshotBefore.name,
								allowedCategories: snapshotBefore.allowedCategories,
								users: snapshotBefore.users,
						  }
						: null,
					snapshotBefore,
					snapshotAfter:
						snapshotAfter ||
						(snapshotBefore
							? {
									// При удалении отдела формируем snapshotAfter с removedUsers
									id: snapshotBefore.id,
									name: snapshotBefore.name,
									allowedCategories: snapshotBefore.allowedCategories,
									users: [],
									removedUsers: snapshotBefore.users ? snapshotBefore.users.map((user: any) => ({ user })) : [],
							  }
							: null),
					adminSnapshot,
				};
			});

			// Сначала фильтруем по конкретному департаменту (departmentId из URL)
			console.log(`🔍 Фильтрация по департаменту: ${departmentId}`);
			console.log(`📊 Логов до фильтрации по департаменту: ${formattedLogs.length}`);

			formattedLogs = formattedLogs.filter((log) => {
				// Проверяем targetDepartment (snapshotAfter для созданных/обновленных отделов)
				if (log.targetDepartment && log.targetDepartment.id === departmentId) {
					console.log(`✅ Лог ${log.id}: найден в targetDepartment (ID: ${log.targetDepartment.id})`);
					return true;
				}

				// Проверяем snapshotBefore для удаленных отделов
				if (log.snapshotBefore && log.snapshotBefore.id === departmentId) {
					console.log(`✅ Лог ${log.id}: найден в snapshotBefore (ID: ${log.snapshotBefore.id})`);
					return true;
				}

				console.log(`❌ Лог ${log.id}: не найден в департаменте ${departmentId}`);
				console.log(`   targetDepartment:`, log.targetDepartment);
				console.log(`   snapshotBefore:`, log.snapshotBefore);
				return false;
			});

			console.log(`📊 Логов после фильтрации по департаменту: ${formattedLogs.length}`);

			// Затем фильтруем по действию если указан
			if (action && action !== "all") {
				console.log(`🔍 Фильтрация по действию: ${action}`);
				console.log(`📊 Логов до фильтрации по действию: ${formattedLogs.length}`);

				formattedLogs = formattedLogs.filter((log) => {
					// Маппинг действий между фронтендом и бэкендом
					let hasAction = false;

					if (action === "create") {
						// Для создания ищем логи с действием create_department
						hasAction = log.actions.includes("create_department");
					} else if (action === "update") {
						// Для редактирования ищем логи с любыми действиями изменения
						// НО НЕ включаем логи удаления
						hasAction = log.actions.some((actionType) => ["add_employees", "remove_employees", "change_name", "change_categories"].includes(actionType));
					}

					if (!hasAction) {
						console.log(`❌ Лог ${log.id} не содержит действие "${action}". Доступные действия:`, log.actions);
						console.log(`   snapshotBefore:`, !!log.snapshotBefore);
						console.log(`   snapshotAfter:`, !!log.snapshotAfter);
					}
					return hasAction;
				});

				console.log(`📊 Логов после фильтрации по действию: ${formattedLogs.length}`);
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
				targetDepartment: {
					id: targetDepartment.id,
					name: targetDepartment.name,
				},
			});
		} catch (err) {
			console.error("Ошибка при получении логов отдела:", err);
			return NextResponse.json(
				{
					error: "Ошибка сервера при получении логов отдела",
					details: err instanceof Error ? err.message : "Неизвестная ошибка",
				},
				{ status: 500 }
			);
		}
	},
	"view_departments_logs", // ✅ Разрешение на просмотр логов отделов
	["superadmin", "admin", "manager"]
);
