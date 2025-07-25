import { db } from "@/drizzle/db";
import { users, departments } from "@/drizzle/schema";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { logUserChange } from "@/lib/logUserChange";
import { Permission } from "@/lib/rolesConfig";
import { eq } from "drizzle-orm";

// Удаление пользователя по id
async function deleteUserHandler(req: NextRequest, context: { user: any; scope: string }, params: { userId: string }) {
	try {
		const { user } = context;
		const userId = parseInt(params.userId, 10);

		// Проверяем, что userId — это число
		if (isNaN(userId)) {
			return NextResponse.json({ error: "Некорректный ID пользователя" }, { status: 400 });
		}

		// Получаем пользователя, которого хотим удалить (вместе с отделом)
		const targetUserArr = await db
			.select({
				id: users.id,
				phone: users.phone,
				role: users.role,
				departmentId: users.departmentId,
				department: {
					id: departments.id,
					name: departments.name,
				},
			})
			.from(users)
			.leftJoin(departments, eq(users.departmentId, departments.id))
			.where(eq(users.id, userId));
		const targetUser = targetUserArr[0];

		// Если пользователь не найден — возвращаем ошибку
		if (!targetUser) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Проверяем права: кто может удалить этого пользователя
		// superadmin может удалить любого, кроме другого superadmin
		// admin может удалить клиента или менеджера из своего отдела, а также менеджера без отдела
		let canDelete = false;
		if (user.role === "superadmin" && targetUser.role !== "superadmin") {
			canDelete = true;
		} else if (user.role === "admin") {
			if (targetUser.role === "client") {
				canDelete = true;
			} else if (
				targetUser.role === "manager" &&
				((user.departmentId && targetUser.departmentId === user.departmentId) || targetUser.departmentId === null) // менеджер без отдела
			) {
				canDelete = true;
			}
		}
		if (!canDelete) {
			return NextResponse.json({ error: "Недостаточно прав для удаления этого пользователя" }, { status: 403 });
		}

		// Логируем удаление пользователя (до удаления)
		await logUserChange({
			targetUserId: userId,
			adminId: user.id,
			action: "delete",
			message: `Удаление пользователя: ${targetUser.phone} (${targetUser.role})`,
			beforeData: targetUser,
		});

		// Удаляем пользователя из базы данных
		await db.delete(users).where(eq(users.id, userId));

		// Возвращаем успешный результат
		return NextResponse.json({ success: true, message: "Пользователь успешно удален" });
	} catch (err) {
		// Если что-то пошло не так — возвращаем ошибку сервера
		console.error("Ошибка при удалении пользователя:", err);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// Экспортируем обработчик DELETE с проверкой прав доступа
export const DELETE = withPermission(
	async (req: NextRequest, context: { user: any; scope: string }) => {
		const userId = req.nextUrl.pathname.split("/")[3]; // Получаем userId из URL
		return deleteUserHandler(req, context, { userId });
	},
	"delete_users" as Permission,
	["superadmin", "admin"]
);
