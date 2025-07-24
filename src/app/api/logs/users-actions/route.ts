import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { Permission } from "@/lib/rolesConfig";
import { UserLog, UserLogResponse } from "@/lib/types";

export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1");
			const limit = parseInt(searchParams.get("limit") || "20");
			const actionFilter = searchParams.get("action");
			const userId = searchParams.get("userId"); // Фильтр по конкретному пользователю

			// Проверяем, существует ли модель UserLog
			let hasUserLogModel = true;
			try {
				// @ts-ignore - Проверяем доступность модели UserLog
				await prisma.userLog.findFirst();
			} catch (e) {
				console.error("Модель UserLog недоступна:", e);
				hasUserLogModel = false;
			}

			if (!hasUserLogModel) {
				const response: UserLogResponse = {
					data: [],
					total: 0,
					page,
					totalPages: 0,
					error: "Модель логов пользователей не настроена. Запустите миграцию базы данных.",
				};
				return NextResponse.json(response);
			}

			// Формируем условия запроса
			const where: any = {};

			// Если пользователь не суперадмин и имеет доступ только к своему отделу
			if (scope === "department") {
				where.departmentId = user.departmentId;
			}

			// Фильтр по действию
			if (actionFilter) {
				where.action = actionFilter;
			}

			// Фильтр по конкретному пользователю
			if (userId) {
				where.targetUserId = parseInt(userId);
			}

			// Получаем логи пользователей с пагинацией
			// @ts-ignore - Используем модель UserLog
			const [logs, total] = await Promise.all([
				prisma.userLog.findMany({
					where,
					include: {
						admin: {
							select: {
								id: true,
								first_name: true,
								last_name: true,
								role: true,
								department: { select: { name: true } },
							},
						},
						targetUser: {
							select: {
								id: true,
								first_name: true,
								last_name: true,
								phone: true,
								role: true,
								department: { select: { name: true } },
							},
						},
						department: {
							select: {
								id: true,
								name: true,
							},
						},
					},
					orderBy: {
						createdAt: "desc",
					},
					skip: (page - 1) * limit,
					take: limit,
				}),
				// @ts-ignore - Используем модель UserLog
				prisma.userLog.count({ where }),
			]);

			// Преобразуем логи для удобного отображения
			const formattedLogs = logs.map((log: any) => {
				const before = (log.snapshotBefore || {}) as Record<string, any>;
				const after = (log.snapshotAfter || {}) as Record<string, any>;
				const diff = [];

				// Формируем список изменений для действия "update"
				if (log.action === "update") {
					for (const key in after) {
						// Игнорируем служебные поля
						if (["id", "createdAt", "password"].includes(key)) continue;

						// Проверяем, изменилось ли значение
						if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
							diff.push({
								key,
								before: before[key],
								after: after[key],
								// Добавляем человекочитаемые названия полей
								fieldName: getFieldName(key),
							});
						}
					}
				}

				return {
					id: log.id,
					createdAt: log.createdAt,
					action: getActionName(log.action),
					message: log.message,
					admin: log.admin,
					targetUser: log.targetUser,
					department: log.department,
					details: log.action === "create" ? { after } : log.action === "delete" ? { before } : { before, after, diff },
				};
			});

			const response: UserLogResponse = {
				data: formattedLogs,
				total,
				page,
				totalPages: Math.ceil(total / limit),
			};

			return NextResponse.json(response);
		} catch (error) {
			console.error("❌ Ошибка при получении логов пользователей:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_users_logs" as Permission,
	["admin", "superadmin"]
);

// Вспомогательная функция для получения человекочитаемого названия действия
function getActionName(action: string): string {
	switch (action) {
		case "create":
			return "Создание";
		case "update":
			return "Редактирование";
		case "delete":
			return "Удаление";
		default:
			return action;
	}
}

// Вспомогательная функция для получения человекочитаемого названия поля
function getFieldName(key: string): string {
	switch (key) {
		case "first_name":
			return "Имя";
		case "last_name":
			return "Фамилия";
		case "middle_name":
			return "Отчество";
		case "phone":
			return "Телефон";
		case "role":
			return "Роль";
		case "status":
			return "Статус";
		case "departmentId":
			return "Отдел";
		case "department":
			return "Отдел";
		case "avatar":
			return "Аватар";
		default:
			return key;
	}
}
