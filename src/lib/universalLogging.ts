// src/lib/universalLogging.ts

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Типы для разных сущностей
type EntityType = "user" | "department" | "product" | "order" | "category";

// Универсальные опции для логирования
// Типы действий для отделов
type DepartmentAction =
	| "change_name" // 1. Изменение названия отдела
	| "add_employees" // 2. Добавление сотрудников
	| "remove_employees" // 3. Удаление сотрудников
	| "change_categories" // 4. Изменение категорий отдела
	| "create_department" // 5. Создание отдела
	| "delete_department"; // 6. Удаление отдела

// Типы действий для пользователей
type UserAction =
	| "create" // Создание пользователя
	| "update" // Обновление пользователя
	| "delete"; // Удаление пользователя

type UniversalLogOptions = {
	entityType: EntityType; // Тип сущности
	entityId: number | null; // ID сущности (null для создания)
	adminId: number; // ID администратора
	message?: string | null;
	beforeData?: any; // Полный объект ДО изменений
	afterData?: any; // Полный объект ПОСЛЕ изменений
	actions?: DepartmentAction[] | UserAction[]; // Массив действий (для отделов и пользователей)
	departmentId?: number | null; // ID отдела (переопределяет отдел администратора)
};

/**
 * Функция для сбора полной информации о пользователе
 * @param userId ID пользователя
 * @returns Полная информация о пользователе
 */
async function getFullUserData(userId: number) {
	try {
		// Получаем полную информацию о пользователе с отделом и заказами
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				department: {
					select: {
						id: true,
						name: true,
					},
				},
				clientOrders: {
					select: {
						id: true,
						title: true,
						description: true,
						status: true,
						createdAt: true,
						managerId: true,
						departmentId: true,
					},
				},
				managerOrders: {
					select: {
						id: true,
						title: true,
						description: true,
						status: true,
						createdAt: true,
						clientId: true,
						departmentId: true,
					},
				},
			},
		});

		if (!user) {
			return null;
		}

		// Формируем полную информацию о пользователе
		const fullUserData = {
			// Основная информация
			id: user.id,
			phone: user.phone,
			first_name: user.first_name,
			last_name: user.last_name,
			middle_name: user.middle_name,
			role: user.role,
			status: user.status,
			createdAt: user.createdAt,
			departmentId: user.departmentId,
			department: user.department,

			// Заказы пользователя
			orders: {
				as_client: user.clientOrders,
				as_manager: user.managerOrders,
				total_as_client: user.clientOrders.length,
				total_as_manager: user.managerOrders.length,
			},

			// Статистика
			statistics: {
				total_orders: user.clientOrders.length + user.managerOrders.length,
				verified: user.status === "verified",
				account_age_days: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
			},
		};

		return fullUserData;
	} catch (error) {
		console.error("Ошибка при сборе полной информации о пользователе:", error);
		return null;
	}
}

/**
 * Функция для сбора полной информации об отделе
 * @param departmentId ID отдела
 * @returns Полная информация об отделе
 */
export async function getFullDepartmentData(departmentId: number) {
	try {
		// Получаем полную информацию об отделе с пользователями, товарами и заказами
		const department = await prisma.department.findUnique({
			where: { id: departmentId },
			include: {
				users: {
					select: {
						id: true,
						phone: true,
						first_name: true,
						last_name: true,
						role: true,
						status: true,
						department: {
							select: {
								id: true,
								name: true,
							},
						},
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
						title: true,
						status: true,
						createdAt: true,
					},
				},
			},
		});

		if (!department) {
			return null;
		}

		// Формируем полную информацию об отделе
		const fullDepartmentData = {
			// Основная информация
			id: department.id,
			name: department.name,
			createdAt: department.createdAt,

			// Связанные данные
			users: department.users, // Теперь users содержит полную информацию включая отделы
			usersCount: department.users.length,
			products: {
				list: department.products,
				count: department.products.length,
			},
			orders: {
				list: department.orders,
				count: department.orders.length,
			},

			// Статистика
			statistics: {
				total_entities: department.users.length + department.products.length + department.orders.length,
				active_users: department.users.filter((u) => u.status === "verified").length,
			},
		};

		return fullDepartmentData;
	} catch (error) {
		console.error("Ошибка при сборе полной информации об отделе:", error);
		return null;
	}
}

/**
 * Функция для сбора полной информации о товаре
 * @param productId ID товара
 * @returns Полная информация о товаре
 */
async function getFullProductData(productId: number) {
	try {
		// Получаем полную информацию о товаре с категорией, отделом и фильтрами
		const product = await prisma.product.findUnique({
			where: { id: productId },
			include: {
				category: {
					select: {
						id: true,
						title: true,
					},
				},
				department: {
					select: {
						id: true,
						name: true,
					},
				},
				productFilterValues: {
					include: {
						filterValue: {
							include: {
								filter: { select: { id: true, title: true } },
							},
						},
					},
				},
			},
		});

		if (!product) {
			return null;
		}

		// Формируем полную информацию о товаре
		const fullProductData = {
			// Основная информация
			id: product.id,
			title: product.title,
			sku: product.sku,
			brand: product.brand,
			price: product.price,
			supplier_price: product.supplierPrice,
			description: product.description,
			image: product.image,
			createdAt: product.createdAt,
			updatedAt: product.updatedAt,
			categoryId: product.categoryId,
			departmentId: product.departmentId,

			// Связанные данные
			category: product.category,
			department: product.department,
			productFilterValues: product.productFilterValues,

			// Статистика
			statistics: {
				has_supplier_price: !!product.supplierPrice,
				has_image: !!product.image,
				has_description: !!product.description,
				days_since_update: Math.floor((Date.now() - new Date(product.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
			},
		};

		return fullProductData;
	} catch (error) {
		console.error("Ошибка при сборе полной информации о товаре:", error);
		return null;
	}
}

/**
 * Функция для сбора полной информации о заказе
 * @param orderId ID заказа
 * @returns Полная информация о заказе
 */
async function getFullOrderData(orderId: number) {
	try {
		// Получаем полную информацию о заказе с клиентом, менеджером и отделом
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			include: {
				client: {
					select: {
						id: true,
						phone: true,
						first_name: true,
						last_name: true,
						role: true,
					},
				},
				manager: {
					select: {
						id: true,
						phone: true,
						first_name: true,
						last_name: true,
						role: true,
					},
				},
				department: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!order) {
			return null;
		}

		// Формируем полную информацию о заказе
		const fullOrderData = {
			// Основная информация
			id: order.id,
			title: order.title,
			description: order.description,
			status: order.status,
			createdAt: order.createdAt,
			clientId: order.clientId,
			managerId: order.managerId,
			departmentId: order.departmentId,

			// Связанные данные
			client: order.client,
			manager: order.manager,
			department: order.department,

			// Статистика
			statistics: {
				has_manager: !!order.managerId,
				has_description: !!order.description,
				days_since_creation: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
			},
		};

		return fullOrderData;
	} catch (error) {
		console.error("Ошибка при сборе полной информации о заказе:", error);
		return null;
	}
}

/**
 * Универсальная функция для логирования изменений
 * @param options Параметры логирования
 */
export async function logChange(options: UniversalLogOptions) {
	try {
		console.log("🔍 Начинаем логирование изменений:", {
			entityType: options.entityType,
			entityId: options.entityId,
			adminId: options.adminId,
			message: options.message,
		});

		// Получаем полные данные администратора для снапшота
		const adminData = await getFullUserData(options.adminId);
		if (!adminData) {
			console.error("❌ Не удалось получить данные администратора");
			return;
		}

		// Определяем departmentId: приоритет у переданного параметра, иначе из данных администратора
		const departmentId = options.departmentId ?? adminData.departmentId ?? null;

		// Собираем данные в зависимости от типа сущности
		let snapshotBefore = options.beforeData;
		let snapshotAfter = options.afterData;

		// Если данные не предоставлены, собираем их автоматически
		// Для создания сущности snapshotBefore не нужен, для обновления - нужен
		if (!snapshotBefore && options.entityId && !options.afterData) {
			if (options.entityType === "user") {
				snapshotBefore = await getFullUserData(options.entityId);
			} else if (options.entityType === "department") {
				snapshotBefore = await getFullDepartmentData(options.entityId);
			} else if (options.entityType === "product") {
				snapshotBefore = await getFullProductData(options.entityId);
			} else if (options.entityType === "order") {
				snapshotBefore = await getFullOrderData(options.entityId);
			}
		}

		// Для создания сущности snapshotAfter берем из переданных данных
		if (!snapshotAfter && options.entityId && !options.afterData) {
			if (options.entityType === "user") {
				snapshotAfter = await getFullUserData(options.entityId);
			} else if (options.entityType === "department") {
				snapshotAfter = await getFullDepartmentData(options.entityId);
			} else if (options.entityType === "product") {
				snapshotAfter = await getFullProductData(options.entityId);
			} else if (options.entityType === "order") {
				snapshotAfter = await getFullOrderData(options.entityId);
			}
		}

		console.log("📝 Подготовленные данные для лога:", {
			entityType: options.entityType,
			entityId: options.entityId,
			adminId: adminData.id,
			departmentId,
			message: options.message,
			snapshotBefore: snapshotBefore ? "есть" : "нет",
			snapshotAfter: snapshotAfter ? "есть" : "нет",
			adminSnapshot: "полный снапшот администратора",
		});

		// Создаем запись в универсальной таблице логов
		const logResult = await prisma.changeLog.create({
			data: {
				entityType: options.entityType,
				message: options.message,
				snapshotBefore: snapshotBefore ? JSON.stringify(snapshotBefore) : Prisma.JsonNull,
				snapshotAfter: snapshotAfter ? JSON.stringify(snapshotAfter) : Prisma.JsonNull,
				adminSnapshot: JSON.stringify(adminData), // Полный снапшот администратора
				entityId: options.entityId,
				adminId: adminData.id,
				departmentId,
				actions: options.actions ? JSON.stringify(options.actions) : Prisma.JsonNull, // Массив действий
			},
		});

		// Дополнительно записываем в специализированные таблицы для совместимости
		if (options.entityType === "product" && options.entityId) {
			await prisma.product_log.create({
				data: {
					action: options.message?.includes("создан") ? "create" : options.message?.includes("удален") || options.message?.includes("Удаление") ? "delete" : "update",
					message: options.message,
					userSnapshot: {
						id: adminData.id,
						first_name: adminData.first_name,
						last_name: adminData.last_name,
						middle_name: adminData.middle_name,
						phone: adminData.phone,
						role: adminData.role,
						department: adminData.department
							? {
									id: adminData.department.id,
									name: adminData.department.name,
							  }
							: null,
					},
					departmentSnapshot: {
						id: departmentId,
						name: departmentId ? options.afterData?.department?.name || options.beforeData?.department?.name || "Отдел не найден" : null,
					},
					// Временные поля для совместимости
					userId: adminData.id,
					departmentId: departmentId,
					productId: options.entityId,
					snapshotBefore: snapshotBefore ? JSON.stringify(snapshotBefore) : null,
					snapshotAfter: snapshotAfter ? JSON.stringify(snapshotAfter) : null,
				},
			});
		}

		console.log("✅ Лог успешно создан:", logResult);
	} catch (error) {
		console.error("❌ Ошибка при логировании изменений:", error);
	}
}

/**
 * Специализированные функции для удобства использования
 */

// Логирование изменений пользователей
export async function logUserChange(options: Omit<UniversalLogOptions, "entityType">) {
	return logChange({
		...options,
		entityType: "user",
	});
}

// Логирование изменений отделов
export async function logDepartmentChange(options: Omit<UniversalLogOptions, "entityType">) {
	return logChange({
		...options,
		entityType: "department",
	});
}

// Логирование изменений товаров
export async function logProductChange(options: Omit<UniversalLogOptions, "entityType">) {
	return logChange({
		...options,
		entityType: "product",
	});
}

// Логирование изменений заказов
export async function logOrderChange(options: Omit<UniversalLogOptions, "entityType">) {
	return logChange({
		...options,
		entityType: "order",
	});
}

/**
 * Специализированная функция для логирования изменений отделов с пользователями
 * Включает информацию о пользователях, которые были добавлены/удалены
 */
export async function logDepartmentChangeWithUsers(options: {
	entityId: number;
	adminId: number;
	message: string;
	beforeData?: any;
	afterData?: any;
	actions: DepartmentAction[];
	// Дополнительная информация о пользователях
	addedUsers?: Array<{
		user: any;
		previousDepartment?: any; // Отдел ДО добавления
		currentDepartment: any; // Отдел ПОСЛЕ добавления
	}>;
	removedUsers?: Array<{
		user: any;
		previousDepartment: any; // Отдел ДО удаления
		currentDepartment?: any; // Отдел ПОСЛЕ удаления
	}>;
}) {
	try {
		// Получаем данные администратора
		const adminData = await getFullUserData(options.adminId);
		if (!adminData) {
			console.error("❌ Не удалось получить данные администратора");
			return;
		}

		// Определяем ID отдела
		const departmentId = options.entityId;

		// Подготавливаем снапшоты
		let snapshotBefore = options.beforeData;
		let snapshotAfter = options.afterData;

		// Если не переданы снапшоты, получаем их автоматически
		if (!snapshotBefore && options.entityId) {
			snapshotBefore = await getFullDepartmentData(options.entityId);
		}
		if (!snapshotAfter && options.entityId) {
			snapshotAfter = await getFullDepartmentData(options.entityId);
		}

		// Добавляем информацию о пользователях в правильные снапшоты
		if (snapshotAfter && options.removedUsers && options.removedUsers.length > 0) {
			// Для remove_employees: добавляем removedUsers в snapshotAfter
			// чтобы показать, какие пользователи были удалены из отдела
			snapshotAfter = {
				...snapshotAfter,
				removedUsers: options.removedUsers.map((ru) => ({
					user: ru.user,
					previousDepartment: ru.previousDepartment,
					currentDepartment: ru.currentDepartment,
					removedAt: new Date().toISOString(),
				})),
			};
		}

		if (snapshotAfter && options.addedUsers && options.addedUsers.length > 0) {
			// Для add_employees: добавляем addedUsers в snapshotAfter
			// чтобы показать, какие пользователи были добавлены в отдел
			snapshotAfter = {
				...snapshotAfter,
				addedUsers: options.addedUsers.map((au) => ({
					user: au.user,
					previousDepartment: au.previousDepartment,
					currentDepartment: au.currentDepartment,
					addedAt: new Date().toISOString(),
				})),
			};
		}

		// ВСЕ информация о пользователях (addedUsers и removedUsers) добавляется в snapshotAfter
		// Снапшоты содержат состояние отдела + детальную информацию об изменениях

		console.log("📝 Подготовленные данные для лога отдела с пользователями:", {
			entityType: "department",
			entityId: options.entityId,
			adminId: adminData.id,
			departmentId,
			message: options.message,
			snapshotBefore: snapshotBefore ? "есть" : "нет",
			snapshotAfter: snapshotAfter ? "есть" : "нет",
			addedUsers: options.addedUsers?.length || 0,
			removedUsers: options.removedUsers?.length || 0,
			adminSnapshot: "полный снапшот администратора",
		});

		// Создаем запись в универсальной таблице логов
		const logResult = await prisma.changeLog.create({
			data: {
				entityType: "department",
				message: options.message,
				snapshotBefore: snapshotBefore ? JSON.stringify(snapshotBefore) : Prisma.JsonNull,
				snapshotAfter: snapshotAfter ? JSON.stringify(snapshotAfter) : Prisma.JsonNull,
				adminSnapshot: JSON.stringify(adminData),
				entityId: options.entityId,
				adminId: adminData.id,
				departmentId,
				actions: JSON.stringify(options.actions),
			},
		});

		console.log("✅ Лог отдела с пользователями успешно создан:", logResult);
	} catch (error) {
		console.error("❌ Ошибка при логировании изменений отдела с пользователями:", error);
	}
}

/**
 * Примеры использования:
 *
 * // При создании пользователя
 * await logUserChange({
 *   entityId: newUserId,
 *   adminId: adminId,
 *   message: "Создан новый пользователь",
 *   afterData: newUserData
 * });
 *
 * // При обновлении пользователя
 * await logUserChange({
 *   entityId: userId,
 *   adminId: adminId,
 *   message: "Обновлен статус пользователя и изменен отдел",
 *   beforeData: oldUserData,
 *   afterData: newUserData
 * });
 *
 * // При удалении пользователя
 * await logUserChange({
 *   entityId: userId,
 *   adminId: adminId,
 *   message: "Пользователь удален",
 *   beforeData: userDataBeforeDelete
 * });
 */
