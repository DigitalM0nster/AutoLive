import { db } from "@/drizzle/db";
import { users, departments, orders } from "@/drizzle/schema";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { eq, desc } from "drizzle-orm";
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
		if (user.role === "superadmin" || user.role === "admin" || user.role === "manager") {
			canAccess = true;
		}
		if (!canAccess) {
			return NextResponse.json({ error: "Недостаточно прав для просмотра данного пользователя" }, { status: 403 });
		}

		// Получаем пользователя с отделом через leftJoin
		const userArr = await db
			.select({
				id: users.id,
				first_name: users.firstName,
				last_name: users.lastName,
				middle_name: users.middleName,
				phone: users.phone,
				role: users.role,
				status: users.status,
				department: {
					id: departments.id,
					name: departments.name,
				},
			})
			.from(users)
			.leftJoin(departments, eq(users.departmentId, departments.id))
			.where(eq(users.id, userId));
		const userData = userArr[0];
		if (!userData) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Получаем заказы менеджера (managerOrders)
		const managerOrders = await db
			.select({
				id: orders.id,
				title: orders.title,
				status: orders.status,
				createdAt: orders.createdAt,
			})
			.from(orders)
			.where(eq(orders.managerId, userId))
			.orderBy(desc(orders.createdAt));

		// Формируем ответ
		const response = {
			id: userData.id,
			first_name: userData.first_name,
			last_name: userData.last_name,
			middle_name: userData.middle_name,
			phone: userData.phone,
			role: userData.role,
			status: userData.status,
			department:
				userData.department && userData.department.id
					? {
							id: userData.department.id,
							name: userData.department.name,
					  }
					: null,
			orders: managerOrders.map((order) => ({
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
