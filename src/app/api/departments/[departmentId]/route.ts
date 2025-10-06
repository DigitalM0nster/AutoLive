// src\app\api\departments\[departmentId]\route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { logUserChange, logDepartmentChangeWithUsers } from "@/lib/universalLogging";

// ✅ Получение одного отдела по ID
export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/").pop());

		if (isNaN(departmentId)) {
			return NextResponse.json({ error: "Некорректный ID отдела" }, { status: 400 });
		}

		// Удаляем проверку на принадлежность к отделу, чтобы все пользователи могли просматривать любые отделы
		try {
			const department = await prisma.department.findUnique({
				where: { id: departmentId },
				select: {
					id: true,
					name: true,
					allowedCategories: {
						select: {
							category: {
								select: { id: true, title: true },
							},
						},
					},
					users: {
						where: {
							role: { in: ["admin", "manager"] },
						},
						select: {
							id: true,
							first_name: true,
							last_name: true,
							role: true,
							phone: true,
						},
					},
					products: {
						select: {
							id: true,
							title: true,
							sku: true,
							brand: true,
							price: true,
						},
					},
					orders: {
						select: {
							id: true,
							comments: true,
							status: true,
							createdAt: true,
						},
						orderBy: {
							createdAt: "desc",
						},
						take: 10,
					},
				},
			});

			if (!department) {
				return NextResponse.json({ error: "Отдел не найден" }, { status: 404 });
			}

			// Преобразуем данные для фронтенда
			const transformedDepartment = {
				...department,
				// Преобразуем allowedCategories в categories для совместимости с фронтендом
				categories: department.allowedCategories.map((ac) => ({
					id: ac.category.id,
					title: ac.category.title,
					// Добавляем количество товаров в этой категории для данного отдела
					productCount: 0, // Будет заполнено ниже
				})),
				// Добавляем количество товаров без категории
				uncategorizedCount: 0, // Будет заполнено ниже
			};

			// Получаем количество товаров в каждой категории для данного отдела
			const categoryProductCounts = await prisma.product.groupBy({
				by: ["categoryId"],
				where: {
					departmentId: departmentId,
					categoryId: { not: null },
				},
				_count: {
					categoryId: true,
				},
			});

			// Обновляем количество товаров в категориях
			transformedDepartment.categories = transformedDepartment.categories.map((cat) => {
				const countData = categoryProductCounts.find((cpc) => cpc.categoryId === cat.id);
				return {
					...cat,
					productCount: countData?._count.categoryId || 0,
				};
			});

			// Получаем количество товаров без категории для данного отдела
			const uncategorizedCount = await prisma.product.count({
				where: {
					departmentId: departmentId,
					categoryId: null,
				},
			});

			transformedDepartment.uncategorizedCount = uncategorizedCount;

			return NextResponse.json(transformedDepartment);
		} catch (err) {
			console.error("Ошибка загрузки отдела:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_departments",
	["superadmin", "admin", "manager"]
);

// ✅ Обновление отдела
// Эта функция обрабатывает следующие изменения:
// 1. Изменение названия отдела
// 2. Изменение разрешенных категорий
// 3. Добавление пользователей в отдел (addUsers)
// 4. Удаление пользователей из отдела (removeUsers)
export const PATCH = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			const body = await req.json();
			const departmentId = Number(req.nextUrl.pathname.split("/").pop());

			if (isNaN(departmentId)) {
				return NextResponse.json({ error: "Некорректный ID отдела" }, { status: 400 });
			}

			if (scope === "department" && user.departmentId !== departmentId) {
				return NextResponse.json({ error: "Нет доступа к этому отделу" }, { status: 403 });
			}

			const { name, categoryIds, addUsers, removeUsers } = body;

			// Получаем старые разрешённые категории
			const prevDepartment = await prisma.department.findUnique({
				where: { id: departmentId },
				select: {
					allowedCategories: {
						select: { categoryId: true },
					},
				},
			});

			const prevCategoryIds = prevDepartment?.allowedCategories.map((c) => c.categoryId) || [];
			const removedCategoryIds = prevCategoryIds.filter((id) => !categoryIds.includes(id));

			// Получаем данные отдела ДО обновления для логирования
			const departmentBefore = await prisma.department.findUnique({
				where: { id: departmentId },
				include: {
					allowedCategories: { include: { category: true } },
					users: {
						where: {
							role: { in: ["admin", "manager"] },
						},
						select: {
							id: true,
							first_name: true,
							last_name: true,
							role: true,
							phone: true,
							middle_name: true,
						},
					},
				},
			});

			// Подготавливаем массив действий для логирования
			const actions: string[] = [];

			// Обновляем отдел и список категорий
			const updated = await prisma.department.update({
				where: { id: departmentId },
				data: {
					name,
					allowedCategories: {
						deleteMany: {},
						create: categoryIds?.map((id: number) => ({ categoryId: id })) || [],
					},
				},
				include: {
					allowedCategories: { include: { category: true } },
				},
			});

			// Логируем изменения отдела
			if (departmentBefore?.name !== updated.name) {
				actions.push("change_name");
			}
			if (JSON.stringify(departmentBefore?.allowedCategories.map((c) => c.categoryId).sort()) !== JSON.stringify(updated.allowedCategories.map((c) => c.categoryId).sort())) {
				actions.push("change_categories");
			}

			// Обрабатываем изменения сотрудников
			if (addUsers && addUsers.length > 0) {
				// Получаем данные пользователей ДО добавления в отдел для логирования
				const usersBeforeAddition = await prisma.user.findMany({
					where: { id: { in: addUsers.map((u: { userId: number; role: "admin" | "manager" }) => u.userId) } },
					include: { department: true },
				});

				// Добавляем пользователей в отдел
				// Для каждого пользователя обновляем departmentId и role
				for (const addUser of addUsers) {
					await prisma.user.update({
						where: { id: addUser.userId },
						data: {
							departmentId: departmentId,
							role: addUser.role,
						},
					});
				}

				// Получаем данные пользователей ПОСЛЕ добавления в отдел для логирования
				const usersAfterAddition = await prisma.user.findMany({
					where: { id: { in: addUsers.map((u: { userId: number; role: "admin" | "manager" }) => u.userId) } },
					include: { department: true },
				});

				// Создаем лог для каждого добавленного пользователя
				for (let i = 0; i < usersBeforeAddition.length; i++) {
					const userBefore = usersBeforeAddition[i];
					const userAfter = usersAfterAddition[i];

					await logUserChange({
						entityId: userBefore.id,
						adminId: user.id,
						message: `Пользователь ${userBefore.phone} добавлен в отдел ${updated.name} с ролью ${addUsers[i].role}`,
						beforeData: userBefore, // Снапшот пользователя ДО (без отдела)
						afterData: userAfter, // Снапшот пользователя ПОСЛЕ (с отделом)
						actions: ["update" as const], // Обновление пользователя (добавление в отдел)
					});
				}

				actions.push("add_employees");
			}

			if (removeUsers && removeUsers.length > 0) {
				// Получаем данные пользователей ДО удаления из отдела для логирования
				const usersBeforeRemoval = await prisma.user.findMany({
					where: { id: { in: removeUsers } },
					include: { department: true },
				});

				// Удаляем пользователей из отдела
				// Убираем только departmentId, роль остается прежней
				await prisma.user.updateMany({
					where: {
						id: { in: removeUsers },
						departmentId: departmentId,
					},
					data: {
						departmentId: null,
						// Роль не меняем - пользователь остается менеджером или админом
					},
				});

				// Получаем данные пользователей ПОСЛЕ удаления из отдела для логирования
				const usersAfterRemoval = await prisma.user.findMany({
					where: { id: { in: removeUsers } },
					include: { department: true },
				});

				// Создаем лог для каждого удаленного пользователя
				for (let i = 0; i < usersBeforeRemoval.length; i++) {
					const userBefore = usersBeforeRemoval[i];
					const userAfter = usersAfterRemoval[i];

					await logUserChange({
						entityId: userBefore.id,
						adminId: user.id,
						message: `Пользователь ${userBefore.phone} удален из отдела ${updated.name}`,
						beforeData: userBefore, // Снапшот пользователя ДО (с отделом)
						afterData: userAfter, // Снапшот пользователя ПОСЛЕ (без отдела)
						actions: ["update" as const], // Обновление пользователя (удаление из отдела)
					});
				}

				actions.push("remove_employees");
			}

			// Всегда создаем один лог отдела со всеми действиями
			if (actions.length > 0) {
				// Получаем актуальные данные отдела ПОСЛЕ изменений
				const departmentAfter = await prisma.department.findUnique({
					where: { id: departmentId },
					include: {
						allowedCategories: { include: { category: true } },
						users: {
							where: {
								role: { in: ["admin", "manager"] },
							},
							select: {
								id: true,
								first_name: true,
								last_name: true,
								role: true,
								phone: true,
								middle_name: true,
							},
						},
					},
				});

				// Формируем детальное сообщение для лога отдела
				let departmentMessage = `Обновление отдела: ${updated.name}`;

				// Добавляем информацию о сотрудниках, если были изменения
				if (addUsers && addUsers.length > 0 && removeUsers && removeUsers.length > 0) {
					departmentMessage = `Изменение состава сотрудников отдела: ${updated.name} - добавлено ${addUsers.length}, удалено ${removeUsers.length}`;
				} else if (addUsers && addUsers.length > 0) {
					departmentMessage = `Добавление ${addUsers.length} сотрудников в отдел: ${updated.name}`;
				} else if (removeUsers && removeUsers.length > 0) {
					departmentMessage = `Удаление ${removeUsers.length} сотрудников из отдела: ${updated.name}`;
				}

				// Если были изменения названия или категорий, добавляем эту информацию
				if (actions.includes("change_name") || actions.includes("change_categories")) {
					const changes = [];
					if (actions.includes("change_name")) changes.push("название");
					if (actions.includes("change_categories")) changes.push("категории");
					if (changes.length > 0) {
						departmentMessage += ` (также изменены: ${changes.join(", ")})`;
					}
				}

				await logDepartmentChangeWithUsers({
					entityId: departmentId,
					adminId: user.id,
					message: departmentMessage,
					beforeData: departmentBefore,
					afterData: departmentAfter,
					actions: actions as ("change_name" | "add_employees" | "remove_employees" | "change_categories")[],
					// Добавляем информацию о пользователях
					addedUsers:
						addUsers && addUsers.length > 0
							? addUsers.map((addUser: { userId: number; role: "admin" | "manager" }) => {
									const user = departmentAfter?.users?.find((u: any) => u.id === addUser.userId);
									return {
										user: user || { id: addUser.userId },
										previousDepartment: null, // Пользователь был добавлен в отдел
										currentDepartment: { id: departmentId, name: updated.name },
									};
							  })
							: undefined,
					removedUsers:
						removeUsers && removeUsers.length > 0
							? removeUsers.map((userId: number) => {
									const user = departmentBefore?.users?.find((u: any) => u.id === userId);
									return {
										user: user || { id: userId },
										previousDepartment: { id: departmentId, name: updated.name }, // Отдел ДО удаления
										currentDepartment: null, // Пользователя больше нет в отделе
									};
							  })
							: undefined,
				});
			}

			// Обнуляем категорию у товаров, если категория больше не разрешена
			if (removedCategoryIds.length > 0) {
				await prisma.product.updateMany({
					where: {
						departmentId,
						categoryId: { in: removedCategoryIds },
					},
					data: {
						categoryId: null,
					},
				});
			}

			// Возвращаем обновленный отдел с актуальными данными сотрудников
			const finalDepartment = await prisma.department.findUnique({
				where: { id: departmentId },
				select: {
					id: true,
					name: true,
					allowedCategories: {
						select: {
							category: {
								select: { id: true, title: true },
							},
						},
					},
					users: {
						where: {
							role: { in: ["admin", "manager"] },
						},
						select: {
							id: true,
							first_name: true,
							last_name: true,
							role: true,
							phone: true,
							middle_name: true,
						},
					},
					products: {
						select: {
							id: true,
							title: true,
							sku: true,
							brand: true,
							price: true,
						},
					},
					orders: {
						select: {
							id: true,
							comments: true,
							status: true,
							createdAt: true,
						},
						orderBy: {
							createdAt: "desc",
						},
						take: 10,
					},
				},
			});

			if (!finalDepartment) {
				return NextResponse.json({ error: "Отдел не найден после обновления" }, { status: 404 });
			}

			// Преобразуем данные для фронтенда в том же формате, что и GET запрос
			const transformedFinalDepartment = {
				...finalDepartment,
				// Преобразуем allowedCategories в categories для совместимости с фронтендом
				categories: finalDepartment.allowedCategories.map((ac) => ({
					id: ac.category.id,
					title: ac.category.title,
					// Добавляем количество товаров в этой категории для данного отдела
					productCount: 0, // Будет заполнено ниже
				})),
				// Добавляем количество товаров без категории
				uncategorizedCount: 0, // Будет заполнено ниже
			};

			// Получаем количество товаров в каждой категории для данного отдела
			const finalCategoryProductCounts = await prisma.product.groupBy({
				by: ["categoryId"],
				where: {
					departmentId: departmentId,
					categoryId: { not: null },
				},
				_count: {
					categoryId: true,
				},
			});

			// Обновляем количество товаров в категориях
			transformedFinalDepartment.categories = transformedFinalDepartment.categories.map((cat) => {
				const countData = finalCategoryProductCounts.find((cpc) => cpc.categoryId === cat.id);
				return {
					...cat,
					productCount: countData?._count.categoryId || 0,
				};
			});

			// Получаем количество товаров без категории для данного отдела
			const finalUncategorizedCount = await prisma.product.count({
				where: {
					departmentId: departmentId,
					categoryId: null,
				},
			});

			transformedFinalDepartment.uncategorizedCount = finalUncategorizedCount;

			return NextResponse.json(transformedFinalDepartment);
		} catch (err) {
			console.error("Ошибка при обновлении отдела:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin", "admin"]
);

// ✅ Удаление отдела
export const DELETE = withPermission(
	async (req: NextRequest, { user: admin, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/").pop());

		if (isNaN(departmentId)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		if (scope === "department" && admin.departmentId !== departmentId) {
			return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
		}

		try {
			// Получаем полную информацию об отделе перед удалением
			const department = await prisma.department.findUnique({
				where: { id: departmentId },
				include: {
					users: {
						include: { department: true },
					},
					orders: { select: { id: true } },
					allowedCategories: { include: { category: true } },
					products: {
						select: {
							id: true,
							title: true,
							sku: true,
						},
					},
				},
			});

			if (!department) {
				return NextResponse.json({ error: "Отдел не найден" }, { status: 404 });
			}

			// Проверяем только заказы (пользователей удалим из отдела)
			if (department.orders.length > 0) {
				return NextResponse.json({ error: "Нельзя удалить отдел с привязанными заказами" }, { status: 400 });
			}

			// Сначала логируем удаление отдела с информацией о пользователях (если они есть)
			if (department.users.length > 0) {
				// Логируем удаление отдела с информацией о пользователях
				await logDepartmentChangeWithUsers({
					entityId: departmentId,
					adminId: admin.id,
					message: `Удаление отдела: ${department.name}`,
					beforeData: department,
					actions: ["delete_department" as const],
					addedUsers: undefined,
					removedUsers: department.users.map((user) => ({
						user: user,
						previousDepartment: { id: departmentId, name: department.name },
						currentDepartment: null,
					})),
				});

				// Удаляем пользователей из отдела
				await prisma.user.updateMany({
					where: { departmentId },
					data: { departmentId: null },
				});
			} else {
				// Если пользователей нет, просто логируем удаление отдела
				await logDepartmentChangeWithUsers({
					entityId: departmentId,
					adminId: admin.id,
					message: `Удаление отдела: ${department.name}`,
					beforeData: department,
					actions: ["delete_department" as const],
					addedUsers: undefined,
					removedUsers: undefined,
				});
			}

			// Если в отделе есть товары, сначала удаляем связанные записи ServiceKitItem
			if (department.products.length > 0) {
				// Получаем ID всех товаров отдела
				const productIds = department.products.map((p) => p.id);

				try {
					// Удаляем записи ServiceKitItem, которые ссылаются на товары отдела
					const deletedServiceKitItems = await prisma.serviceKitItem.deleteMany({
						where: {
							OR: [{ product_id: { in: productIds } }, { analog_product_id: { in: productIds } }],
						},
					});

					// Удаляем записи ProductAnalog, которые ссылаются на товары отдела
					const deletedProductAnalogs = await prisma.productAnalog.deleteMany({
						where: {
							OR: [{ productId: { in: productIds } }, { analogId: { in: productIds } }],
						},
					});

					// Удаляем записи ProductFilterValue для товаров отдела
					const deletedProductFilterValues = await prisma.productFilterValue.deleteMany({
						where: {
							productId: { in: productIds },
						},
					});
				} catch (error) {
					console.error("Ошибка при удалении связанных записей товаров:", error);
					const errorMessage = error instanceof Error ? error.message : String(error);
					throw new Error(`Не удалось удалить связанные записи товаров: ${errorMessage}`);
				}
			}

			// Удаляем отдел (теперь все связанные записи уже удалены)
			await prisma.department.delete({
				where: { id: departmentId },
			});

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("Ошибка при удалении отдела:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin"]
);
