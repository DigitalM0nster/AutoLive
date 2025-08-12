import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

interface ExtendedRequestContext {
	user: any;
	scope: string;
}

export const POST = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			const { userIds } = await req.json();

			if (!Array.isArray(userIds)) {
				return NextResponse.json({ error: "userIds должен быть массивом" }, { status: 400 });
			}

			// Получаем существующих пользователей с полными данными
			const existingUsers = await prisma.user.findMany({
				where: {
					id: {
						in: userIds,
					},
				},
				select: {
					id: true,
					first_name: true,
					last_name: true,
					middle_name: true,
					phone: true,
					role: true,
					status: true,
					department: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			});

			// Создаем Map с ID пользователя как ключом и данными пользователя как значением
			const usersMap = existingUsers.reduce((map, user) => {
				map.set(user.id, user);
				return map;
			}, new Map());

			return NextResponse.json({
				existingUsers: Object.fromEntries(usersMap), // Преобразуем Map в объект для JSON
			});
		} catch (err) {
			console.error("Ошибка при проверке существования пользователей:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_users_logs",
	["superadmin", "admin", "manager"]
);
