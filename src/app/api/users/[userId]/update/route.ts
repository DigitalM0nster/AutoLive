import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import type { User } from "@/lib/types";
import { logUserChange } from "@/lib/logUserChange";

interface ExtendedRequestContext {
	user: Pick<User, "id" | "role"> & { departmentId: number | null };
	scope: string;
}

// Обработчик для обновления данных пользователя
async function updateUserHandler(req: NextRequest, context: { user: any; scope: "all" | "department" | "own" }, params: { userId: string }) {
	try {
		const { user, scope } = context;
		const userId = parseInt(params.userId, 10);

		if (isNaN(userId)) {
			return NextResponse.json({ error: "Некорректный ID пользователя" }, { status: 400 });
		}

		// Получаем текущие данные пользователя
		const targetUser = await prisma.user.findUnique({
			where: { id: userId },
			include: { department: true },
		});

		if (!targetUser) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Проверка прав доступа в зависимости от роли
		let canUpdate = false;
		let canUpdateRole = false;
		let canUpdateDepartment = false;
		let canUpdateStatus = false;
		let canUpdateName = false;

		// Суперадмин может менять все данные любого пользователя, кроме телефона
		if (user.role === "superadmin") {
			canUpdate = true;
			canUpdateRole = true;
			canUpdateDepartment = true;
			canUpdateStatus = true;
			canUpdateName = true;
		}
		// Админ может менять данные менеджеров из своего отдела и пользователей
		else if (user.role === "admin" && user.departmentId) {
			// Админ может редактировать:
			// 1. Менеджеров из своего отдела
			// 2. Менеджеров, которые не принадлежат ни к какому отделу
			// 3. Обычных пользователей (client)
			if ((targetUser.role === "manager" && (targetUser.departmentId === user.departmentId || targetUser.departmentId === null)) || targetUser.role === "client") {
				canUpdate = true;
				canUpdateStatus = true;
				canUpdateName = true;

				// Админ может менять роль только между менеджером и пользователем
				if (targetUser.role === "manager" || targetUser.role === "client") {
					canUpdateRole = true;
				}

				// Админ может добавить менеджера без отдела в свой отдел
				if (targetUser.role === "manager" && targetUser.departmentId === null) {
					canUpdateDepartment = true;
				}
			}
		}
		// Менеджер может менять только ФИО и статус пользователей
		else if (user.role === "manager") {
			if (targetUser.role === "client") {
				canUpdate = true;
				canUpdateStatus = true;
				canUpdateName = true;
			}
		}

		if (!canUpdate) {
			return NextResponse.json({ error: "Недостаточно прав для обновления данных пользователя" }, { status: 403 });
		}

		// Получаем данные из запроса
		const data = await req.json();
		const updateData: any = {};

		// Проверяем и применяем только разрешенные изменения
		if (canUpdateName) {
			if (data.first_name !== undefined) updateData.first_name = data.first_name;
			if (data.last_name !== undefined) updateData.last_name = data.last_name;
			if (data.middle_name !== undefined) updateData.middle_name = data.middle_name;
		}

		if (canUpdateRole) {
			if (data.role !== undefined) {
				// Никто не может назначить роль суперадмина
				if (data.role === "superadmin") {
					return NextResponse.json({ error: "Невозможно назначить роль суперадмина" }, { status: 403 });
				}

				// Проверяем, что админ не пытается установить роль суперадмина или админа
				if (user.role === "admin" && (data.role === "superadmin" || data.role === "admin")) {
					return NextResponse.json({ error: "Недостаточно прав для установки данной роли" }, { status: 403 });
				}

				updateData.role = data.role;

				// Если роль меняется на "client" или "superadmin", автоматически отвязываем пользователя от отдела
				if (data.role === "client" || data.role === "superadmin") {
					updateData.departmentId = null;
				}
			}
		}

		if (canUpdateStatus && data.status !== undefined) {
			updateData.status = data.status;
		}

		if (canUpdateDepartment && data.departmentId !== undefined) {
			// Если departmentId равен null или пустой строке, устанавливаем null
			updateData.departmentId = data.departmentId === null || data.departmentId === "" ? null : data.departmentId;

			// Если роль пользователя - client или superadmin, то отдел не может быть установлен
			if (targetUser.role === "client" || targetUser.role === "superadmin" || data.role === "client" || data.role === "superadmin") {
				updateData.departmentId = null;
			}

			// Если пользователь - админ, он может добавить менеджера только в свой отдел
			if (user.role === "admin" && updateData.departmentId !== null) {
				if (updateData.departmentId != user.departmentId) {
					return NextResponse.json({ error: "Вы можете добавить менеджера только в свой отдел" }, { status: 403 });
				}
			}
		}

		// Если нет данных для обновления, возвращаем ошибку
		if (Object.keys(updateData).length === 0) {
			return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });
		}

		// Создаем сообщение для лога
		const logMessage = `Обновление пользователя: ${targetUser.first_name || ""} ${targetUser.last_name || ""} (${targetUser.phone})`;

		// Обновляем данные пользователя
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: updateData,
			include: {
				department: true,
			},
		});

		// Логируем изменения
		await logUserChange({
			targetUserId: userId,
			adminId: user.id,
			action: "update",
			message: logMessage,
			beforeData: targetUser,
			afterData: updatedUser,
		});

		// Формируем ответ
		const response = {
			id: updatedUser.id,
			first_name: updatedUser.first_name,
			last_name: updatedUser.last_name,
			middle_name: updatedUser.middle_name,
			phone: updatedUser.phone,
			role: updatedUser.role,
			status: updatedUser.status,
			avatar: updatedUser.avatar,
			department: updatedUser.department
				? {
						id: updatedUser.department.id,
						name: updatedUser.department.name,
				  }
				: null,
		};

		return NextResponse.json(response);
	} catch (err) {
		console.error("Ошибка при обновлении данных пользователя:", err);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// Используем withPermission с правильной сигнатурой
export const PUT = withPermission(
	async (req: NextRequest, context: { user: any; scope: "all" | "department" | "own" }) => {
		const userId = req.nextUrl.pathname.split("/")[3]; // Получаем userId из URL
		return updateUserHandler(req, context, { userId });
	},
	"view_orders",
	["superadmin", "admin", "manager"]
);
