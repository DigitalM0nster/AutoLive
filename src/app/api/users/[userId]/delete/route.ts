import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { logUserChange } from "@/lib/logUserChange";
import { Permission } from "@/lib/rolesConfig";

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
			targetUserId: userId,
			adminId: user.id,
			action: "delete",
			message: `Удаление пользователя: ${targetUser.phone} (${targetUser.role})`,
			beforeData: targetUser,
		});

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
export const DELETE = withPermission(
	async (req: NextRequest, context: { user: any; scope: string }) => {
		const userId = req.nextUrl.pathname.split("/")[3]; // Получаем userId из URL
		return deleteUserHandler(req, context, { userId });
	},
	"delete_users" as Permission,
	["superadmin", "admin"]
);
