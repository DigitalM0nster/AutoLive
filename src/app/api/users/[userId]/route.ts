import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { Permission } from "@/lib/rolesConfig";
import { logUserChange, logDepartmentChangeWithUsers, getFullDepartmentData } from "@/lib/universalLogging";

// Создаем обработчик, который будет вызван после проверки прав доступа
async function getUserHandler(req: NextRequest, context: { user: any; scope: "all" | "department" | "own" }, params: { userId: string }) {
	try {
		const { user, scope } = context;
		const userId = parseInt(params.userId, 10);

		if (isNaN(userId)) {
			return NextResponse.json({ error: "Некорректный ID пользователя" }, { status: 400 });
		}

		// Проверяем наличие параметра allUsers в URL
		const url = new URL(req.url);
		const allUsers = url.searchParams.get("allUsers") === "true";

		// Проверка прав доступа в зависимости от роли
		let canAccess = false;

		// Суперадмин может просматривать любого пользователя
		if (user.role === "superadmin") {
			canAccess = true;
		}
		// Админ может просматривать всех пользователей
		else if (user.role === "admin") {
			canAccess = true;
		}
		// Менеджер тоже может просматривать всех пользователей
		else if (user.role === "manager") {
			canAccess = true;
		}

		if (!canAccess) {
			return NextResponse.json({ error: "Недостаточно прав для просмотра данного пользователя" }, { status: 403 });
		}

		// Получаем данные пользователя
		const userData = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				department: true,
				managerOrders: {
					select: {
						id: true,
						title: true,
						status: true,
						createdAt: true,
					},
					orderBy: {
						createdAt: "desc",
					},
				},
			},
		});

		if (!userData) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Формируем ответ
		const response = {
			id: userData.id,
			first_name: userData.first_name,
			last_name: userData.last_name,
			middle_name: userData.middle_name,
			phone: userData.phone,
			role: userData.role,
			status: userData.status,
			department: userData.department
				? {
						id: userData.department.id,
						name: userData.department.name,
				  }
				: null,
			orders: userData.managerOrders.map((order) => ({
				id: order.id,
				title: order.title,
				status: order.status,
				createdAt: order.createdAt,
			})),
		};

		return NextResponse.json(response);
	} catch (err) {
		console.error("Ошибка при получении данных пользователя:", err);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
// Обработчик для удаления пользователя
async function deleteUserHandler(req: NextRequest, context: { user: any; scope: string }, params: { userId: string }) {
	try {
		const { user } = context;
		const userId = parseInt(params.userId, 10);

		if (isNaN(userId)) {
			return NextResponse.json({ error: "Некорректный ID пользователя" }, { status: 400 });
		}

		// Получаем данные пользователя, которого собираемся удалить
		const targetUser = await prisma.user.findUnique({
			where: { id: userId },
			include: { department: true },
		});

		if (!targetUser) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Проверка прав доступа в зависимости от роли
		let canDelete = false;

		// Суперадмин может удалять любых пользователей, кроме других суперадминов
		if (user.role === "superadmin" && targetUser.role !== "superadmin") {
			canDelete = true;
		}
		// Админ может удалять менеджеров из своего отдела и обычных пользователей
		else if (user.role === "admin") {
			if (targetUser.role === "client") {
				canDelete = true;
			} else if (targetUser.role === "manager" && user.departmentId && targetUser.departmentId === user.departmentId) {
				canDelete = true;
			}
		}

		if (!canDelete) {
			return NextResponse.json({ error: "Недостаточно прав для удаления этого пользователя" }, { status: 403 });
		}

		// Логируем удаление пользователя перед удалением
		await logUserChange({
			entityId: userId,
			adminId: user.id,
			message: `Удаление пользователя: ${targetUser.phone} (${targetUser.role})`,
			beforeData: targetUser,
			actions: ["delete"], // ✅ Удаление пользователя
		});

		// Если пользователь был в отделе, логируем изменение отдела
		if (targetUser.department) {
			// Получаем полные данные отдела ДО удаления пользователя
			const departmentBefore = await getFullDepartmentData(targetUser.department.id);

			await logDepartmentChangeWithUsers({
				entityId: targetUser.department.id,
				adminId: user.id,
				message: `Удаление пользователя ${targetUser.phone} из отдела ${targetUser.department.name}`,
				beforeData: departmentBefore, // ✅ Полные данные отдела ДО удаления пользователя
				afterData: null, // Пользователя больше нет в отделе
				actions: ["remove_employees"], // ✅ 3. Удаление сотрудников
				removedUsers: [
					{
						user: targetUser,
						previousDepartment: targetUser.department, // Отдел ДО удаления
						currentDepartment: null, // Пользователя больше нет в отделе
					},
				],
			});
		}

		// Удаляем пользователя
		await prisma.user.delete({
			where: { id: userId },
		});

		return NextResponse.json({ success: true, message: "Пользователь успешно удален" });
	} catch (err) {
		console.error("Ошибка при удалении пользователя:", err);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// Используем withPermission с правильной сигнатурой
export const GET = withPermission(
	async (req: NextRequest, context: { user: any; scope: "all" | "department" | "own" }) => {
		// Извлекаем userId из URL, используя стандартные методы Next.js
		const userId = req.nextUrl.pathname.split("/").pop();
		return getUserHandler(req, context, { userId: userId || "" });
	},
	"view_orders",
	["superadmin", "admin", "manager"]
);
// Обработчик для обновления пользователя
async function updateUserHandler(req: NextRequest, context: { user: any; scope: string }, params: { userId: string }) {
	try {
		const { user } = context;
		const userId = parseInt(params.userId, 10);

		if (isNaN(userId)) {
			return NextResponse.json({ error: "Некорректный ID пользователя" }, { status: 400 });
		}

		// Получаем данные пользователя до обновления
		const userBeforeUpdate = await prisma.user.findUnique({
			where: { id: userId },
			include: { department: true },
		});

		if (!userBeforeUpdate) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Получаем данные для обновления
		const data = await req.json();
		const { first_name, last_name, middle_name, phone, role, status, departmentId } = data;

		// Проверка прав доступа
		let canUpdate = false;

		// Суперадмин может обновлять любого пользователя
		if (user.role === "superadmin") {
			canUpdate = true;
		}
		// Админ может обновлять пользователей из своего отдела и обычных пользователей
		else if (user.role === "admin") {
			if (userBeforeUpdate.role === "client") {
				canUpdate = true;
			} else if (userBeforeUpdate.role === "manager" && user.departmentId && userBeforeUpdate.departmentId === user.departmentId) {
				canUpdate = true;
			}
		}

		if (!canUpdate) {
			return NextResponse.json({ error: "Недостаточно прав для обновления этого пользователя" }, { status: 403 });
		}

		// Проверка на существование пользователя с таким телефоном (если телефон изменяется)
		if (phone && phone !== userBeforeUpdate.phone) {
			const existingUser = await prisma.user.findUnique({
				where: { phone },
			});

			if (existingUser) {
				return NextResponse.json({ error: "Пользователь с таким номером телефона уже существует" }, { status: 400 });
			}
		}

		// Получаем полные снапшоты отделов ДО изменения (если пользователь был в отделе)
		let beforeDepartmentSnapshot = null;
		if (userBeforeUpdate.departmentId) {
			// Создаем снапшот отдела ДО изменения (ОСТАВЛЯЕМ пользователя, который будет переведен)
			const departmentBefore = await prisma.department.findUnique({
				where: { id: userBeforeUpdate.departmentId },
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

			if (departmentBefore) {
				// Создаем снапшот ДО изменения (ОСТАВЛЯЕМ пользователя, который будет переведен)
				beforeDepartmentSnapshot = {
					...departmentBefore,
					users: departmentBefore.users, // Оставляем всех пользователей, включая того, который будет переведен
					usersCount: departmentBefore.users.length,
					statistics: {
						total_entities: departmentBefore.users.length + departmentBefore.products.length + departmentBefore.orders.length,
						active_users: departmentBefore.users.filter((u) => u.status === "verified").length,
					},
				};
			}
		}

		// Обновляем пользователя
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: {
				first_name: first_name || null,
				last_name: last_name || null,
				middle_name: middle_name || null,
				phone: phone || userBeforeUpdate.phone,
				role: role || userBeforeUpdate.role,
				status: status || userBeforeUpdate.status,
				departmentId: departmentId ? parseInt(departmentId) : null,
			},
			include: { department: true },
		});

		// Получаем полные снапшоты отделов ПОСЛЕ изменения (если пользователь теперь в отделе)
		let afterDepartmentSnapshot = null;
		if (updatedUser.departmentId) {
			afterDepartmentSnapshot = await getFullDepartmentData(updatedUser.departmentId);
		}

		// Если пользователь переходит из одного отдела в другой, создаем снапшот нового отдела ДО добавления
		let newDepartmentBeforeSnapshot = null;
		if (userBeforeUpdate.departmentId && updatedUser.departmentId && userBeforeUpdate.departmentId !== updatedUser.departmentId) {
			// Создаем снапшот нового отдела ДО добавления пользователя
			const newDepartmentBefore = await prisma.department.findUnique({
				where: { id: updatedUser.departmentId },
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

			if (newDepartmentBefore) {
				newDepartmentBeforeSnapshot = {
					...newDepartmentBefore,
					users: newDepartmentBefore.users, // Оставляем всех пользователей (пользователь еще не добавлен)
					usersCount: newDepartmentBefore.users.length,
					statistics: {
						total_entities: newDepartmentBefore.users.length + newDepartmentBefore.products.length + newDepartmentBefore.orders.length,
						active_users: newDepartmentBefore.users.filter((u) => u.status === "verified").length,
					},
				};
			}
		}

		// Логируем обновление пользователя
		await logUserChange({
			entityId: userId,
			adminId: user.id,
			message: `Обновление пользователя: ${updatedUser.phone} (${updatedUser.role})`,
			beforeData: userBeforeUpdate,
			afterData: updatedUser,
			actions: ["update"], // ✅ Обновление пользователя
		});

		// Если изменился отдел пользователя, логируем изменение отдела
		if (userBeforeUpdate.departmentId !== updatedUser.departmentId) {
			// Если пользователь был в отделе и теперь его нет - логируем удаление из отдела
			if (userBeforeUpdate.departmentId && !updatedUser.departmentId) {
				await logDepartmentChangeWithUsers({
					entityId: userBeforeUpdate.departmentId,
					adminId: user.id,
					message: `Пользователь ${updatedUser.phone} удален из отдела ${userBeforeUpdate.department?.name}`,
					beforeData: beforeDepartmentSnapshot, // Полный снапшот отдела ДО изменения
					afterData: null, // Пользователя больше нет в отделе
					actions: ["remove_employees"], // ✅ 3. Удаление сотрудников
					removedUsers: [
						{
							user: updatedUser,
							previousDepartment: userBeforeUpdate.department, // Отдел ДО удаления
							currentDepartment: null, // Пользователя больше нет в отделе
						},
					],
				});
			}
			// Если пользователь не был в отделе, а теперь есть - логируем добавление в отдел
			else if (!userBeforeUpdate.departmentId && updatedUser.departmentId) {
				// Создаем снапшот отдела ДО добавления пользователя
				const departmentBeforeAddition = await prisma.department.findUnique({
					where: { id: updatedUser.departmentId },
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

				const departmentBeforeSnapshot = departmentBeforeAddition
					? {
							...departmentBeforeAddition,
							users: departmentBeforeAddition.users, // Оставляем всех пользователей (пользователь еще не добавлен)
							usersCount: departmentBeforeAddition.users.length,
							statistics: {
								total_entities: departmentBeforeAddition.users.length + departmentBeforeAddition.products.length + departmentBeforeAddition.orders.length,
								active_users: departmentBeforeAddition.users.filter((u) => u.status === "verified").length,
							},
					  }
					: null;

				await logDepartmentChangeWithUsers({
					entityId: updatedUser.departmentId,
					adminId: user.id,
					message: `Пользователь ${updatedUser.phone} добавлен в отдел ${updatedUser.department?.name}`,
					beforeData: departmentBeforeSnapshot, // Снапшот отдела ДО добавления пользователя
					afterData: afterDepartmentSnapshot, // Полный снапшот отдела ПОСЛЕ изменения
					actions: ["add_employees"], // ✅ 2. Добавление сотрудников
					addedUsers: [
						{
							user: updatedUser,
							previousDepartment: null, // Пользователя не было в отделе
							currentDepartment: updatedUser.department, // Отдел ПОСЛЕ добавления
						},
					],
				});
			}
			// Если пользователь перешел из одного отдела в другой
			else if (userBeforeUpdate.departmentId && updatedUser.departmentId && userBeforeUpdate.departmentId !== updatedUser.departmentId) {
				// Логируем удаление из старого отдела
				await logDepartmentChangeWithUsers({
					entityId: userBeforeUpdate.departmentId,
					adminId: user.id,
					message: `Пользователь ${updatedUser.phone} переведен из отдела ${userBeforeUpdate.department?.name} в отдел ${updatedUser.department?.name}`,
					beforeData: beforeDepartmentSnapshot, // Полный снапшот старого отдела ДО изменения
					afterData: null, // Пользователя больше нет в старом отделе
					actions: ["remove_employees"], // ✅ 3. Удаление сотрудников
					removedUsers: [
						{
							user: updatedUser,
							previousDepartment: userBeforeUpdate.department, // Отдел ДО перевода
							currentDepartment: updatedUser.department, // Отдел ПОСЛЕ перевода (куда пошел пользователь)
						},
					],
				});

				// Логируем добавление в новый отдел
				await logDepartmentChangeWithUsers({
					entityId: updatedUser.departmentId,
					adminId: user.id,
					message: `Пользователь ${updatedUser.phone} переведен в отдел ${updatedUser.department?.name} из отдела ${userBeforeUpdate.department?.name}`,
					beforeData: newDepartmentBeforeSnapshot, // Снапшот нового отдела ДО добавления пользователя
					afterData: afterDepartmentSnapshot, // Полный снапшот нового отдела ПОСЛЕ изменения
					actions: ["add_employees"], // ✅ 2. Добавление сотрудников
					addedUsers: [
						{
							user: updatedUser,
							previousDepartment: userBeforeUpdate.department, // Отдел ДО перевода
							currentDepartment: updatedUser.department, // Отдел ПОСЛЕ перевода
						},
					],
				});
			}
		}

		return NextResponse.json(updatedUser);
	} catch (err) {
		console.error("Ошибка при обновлении пользователя:", err);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// Используем withPermission с правильной сигнатурой
export const PATCH = withPermission(
	async (req: NextRequest, context: { user: any; scope: string }) => {
		const userId = req.nextUrl.pathname.split("/")[3]; // Получаем userId из URL
		return updateUserHandler(req, context, { userId });
	},
	"create_users" as Permission,
	["superadmin", "admin"]
);

// Используем withPermission с правильной сигнатурой
export const DELETE = withPermission(
	async (req: NextRequest, context: { user: any; scope: string }) => {
		const userId = req.nextUrl.pathname.split("/")[3]; // Получаем userId из URL
		return deleteUserHandler(req, context, { userId });
	},
	"delete_users" as Permission,
	["superadmin", "admin"]
);
