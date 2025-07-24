import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import type { User } from "@/lib/types";

interface ExtendedRequestContext {
	user: Pick<User, "id" | "role"> & { departmentId: number | null };
	scope: string;
}

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
			avatar: userData.avatar,
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
