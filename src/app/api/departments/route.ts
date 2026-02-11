// src\app\api\departments\route.ts

import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { logDepartmentChange, logUserChange } from "@/lib/universalLogging";
import { withDbRetry } from "@/lib/utils";

// ✅ Получение списка отделов
export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			// Обёрнуто в withDbRetry: при "Connection terminated unexpectedly" (Neon) запрос повторяется
			const departments = await withDbRetry(async () =>
				prisma.department.findMany({
					select: {
						id: true,
						name: true,
						allowedCategories: {
							select: {
								category: {
									select: {
										id: true,
										title: true,
									},
								},
							},
						},
					},
				})
			);

			// Преобразуем данные для удобного использования на фронтенде
			const departmentsWithCategories = departments.map((dept) => ({
				id: dept.id,
				name: dept.name,
				categories: dept.allowedCategories.map((dc) => dc.category.title),
			}));

			return NextResponse.json(departmentsWithCategories);
		} catch (err) {
			console.error("Ошибка загрузки отделов:", err);
			return NextResponse.json("Ошибка сервера", { status: 500 });
		}
	},
	"view_departments",
	["superadmin", "admin", "manager"] // Добавляем manager в список разрешенных ролей
);

// ✅ Создание нового отдела
export const POST = withPermission(
	async (req: NextRequest, { user }) => {
		try {
			const body = await req.json();
			const { name, categoryIds, userIds } = body; // Добавляем userIds для назначения пользователей

			if (!name || !Array.isArray(categoryIds)) {
				return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
			}

			// Создаем отдел
			const department = await prisma.department.create({
				data: {
					name,
					allowedCategories: {
						create: categoryIds.map((categoryId: number) => ({ categoryId })),
					},
				},
				include: {
					allowedCategories: { include: { category: true } },
					users: true, // Включаем пользователей для логирования
				},
			});

			// Если указаны пользователи для назначения в отдел
			if (userIds && Array.isArray(userIds) && userIds.length > 0) {
				// Получаем данные пользователей ДО назначения в отдел
				const usersBeforeAssignment = await prisma.user.findMany({
					where: { id: { in: userIds } },
					include: { department: true },
				});

				// Назначаем пользователей в отдел
				await prisma.user.updateMany({
					where: { id: { in: userIds } },
					data: { departmentId: department.id },
				});

				// Получаем данные пользователей ПОСЛЕ назначения в отдел
				const usersAfterAssignment = await prisma.user.findMany({
					where: { id: { in: userIds } },
					include: { department: true },
				});

				// Создаем лог для каждого пользователя
				for (let i = 0; i < usersBeforeAssignment.length; i++) {
					const userBefore = usersBeforeAssignment[i];
					const userAfter = usersAfterAssignment[i];

					await logUserChange({
						entityId: userBefore.id,
						adminId: user.id, // ✅ Отсюда получается снапшот админа
						message: `Пользователь ${userBefore.phone} назначен в отдел ${department.name}`,
						beforeData: userBefore, // ✅ Снапшот пользователя ДО (без отдела)
						afterData: userAfter, // ✅ Снапшот пользователя ПОСЛЕ (с отделом)
						actions: ["update"], // ✅ Обновление пользователя (назначение в отдел)
					});
				}

				// Получаем обновленный отдел с пользователями для логирования
				const departmentWithUsers = await prisma.department.findUnique({
					where: { id: department.id },
					include: {
						allowedCategories: { include: { category: true } },
						users: true,
					},
				});

				// Логируем создание отдела с сотрудниками
				await logDepartmentChange({
					entityId: department.id,
					adminId: user.id,
					message: `Создание отдела: ${department.name} с ${usersAfterAssignment.length} сотрудниками`,
					afterData: departmentWithUsers,
					actions: ["create_department"], // ✅ Создание отдела
				});
			} else {
				// Логируем создание отдела без сотрудников
				await logDepartmentChange({
					entityId: department.id,
					adminId: user.id,
					message: `Создание отдела: ${department.name}`,
					afterData: department,
					actions: ["create_department"], // ✅ Создание отдела
				});
			}

			return NextResponse.json(department);
		} catch (error) {
			console.error("Ошибка при создании отдела:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin"]
);
