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
			const { searchParams } = new URL(req.url);
			const userIdsParam = searchParams.get("userIds");

			if (!userIdsParam) {
				return NextResponse.json({ error: "userIds обязателен" }, { status: 400 });
			}

			const userIds = userIdsParam
				.split(",")
				.map((id) => parseInt(id))
				.filter((id) => !isNaN(id));

			if (userIds.length === 0) {
				return NextResponse.json({ existingUsers: {} });
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
