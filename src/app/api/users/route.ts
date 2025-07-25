import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import type { User } from "@/lib/types";
import { db } from "@/drizzle/db";
import { users, departments, orders } from "@/drizzle/schema";
import { eq, like, or, and, asc, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

interface ExtendedRequestContext {
	user: Pick<User, "id" | "role"> & { departmentId: number | null };
	scope: string;
}

export const GET = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "5", 10);
			const skip = (page - 1) * limit;

			const whereConditions: any[] = [];

			// Добавляем поддержку поиска
			const searchQuery = searchParams.get("search");
			if (searchQuery) {
				// Проверяем, является ли поисковый запрос числом (ID пользователя)
				const isNumeric = /^\d+$/.test(searchQuery);

				if (isNumeric) {
					// Если запрос - число, ищем по ID или телефону
					whereConditions.push(or(eq(users.id, parseInt(searchQuery, 10)), like(users.phone, `%${searchQuery}%`)));
				} else {
					// Иначе ищем по ФИО или телефону
					whereConditions.push(
						or(
							like(users.firstName, `%${searchQuery}%`),
							like(users.lastName, `%${searchQuery}%`),
							like(users.middleName, `%${searchQuery}%`),
							like(users.phone, `%${searchQuery}%`)
						)
					);
				}
			}

			const statusParam = searchParams.get("status");
			if (statusParam === "verified" || statusParam === "unverified") {
				whereConditions.push(eq(users.status, statusParam));
			}

			// Добавляем фильтрацию по роли
			const roleParam = searchParams.get("role");
			if (roleParam && ["superadmin", "admin", "manager", "client"].includes(roleParam)) {
				whereConditions.push(eq(users.role, roleParam as "superadmin" | "admin" | "manager" | "client"));
			}

			const departmentIdParam = searchParams.get("departmentId");
			const allUsersParam = searchParams.get("allUsers");
			const withoutDepartmentParam = searchParams.get("withoutDepartment");
			const showAllUsers = allUsersParam === "true";
			const showWithoutDepartment = withoutDepartmentParam === "true";

			// Фильтр для пользователей без отдела
			if (showWithoutDepartment) {
				// @ts-ignore - временно игнорируем ошибку типов для null
				whereConditions.push(eq(users.departmentId, null as any));
			}
			// Если указан конкретный отдел, фильтруем по нему независимо от роли пользователя
			else if (departmentIdParam) {
				whereConditions.push(eq(users.departmentId, parseInt(departmentIdParam, 10)));
			}
			// Если запрошены все пользователи или пользователь имеет права
			else if (showAllUsers || user.role === "superadmin" || user.role === "admin") {
				// Не добавляем фильтр, показываем всех пользователей
				// Это позволяет админам видеть всех пользователей по умолчанию
			}
			// По умолчанию для менеджера показываем только его
			else if (user.role === "manager") {
				whereConditions.push(eq(users.id, user.id));
			}

			const sortParam = searchParams.get("sortBy"); // "fullName"
			const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

			let orderBy: any = { createdAt: sortOrder };

			if (sortParam === "fullName") {
				orderBy = [{ firstName: sortOrder }, { lastName: sortOrder }];
			} else if (sortParam === "phone") {
				orderBy = { phone: sortOrder };
			} else {
				// Используем поле id вместо createdAt, так как createdAt может отсутствовать в схеме
				orderBy = sortOrder === "asc" ? asc(users.id) : desc(users.id);
			}

			// Формируем условие WHERE с использованием and()
			const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

			const userList = await db
				.select({
					id: users.id,
					first_name: users.firstName,
					last_name: users.lastName,
					middle_name: users.middleName,
					phone: users.phone,
					role: users.role,
					status: users.status,
					departmentId: users.departmentId,
					department: {
						id: departments.id,
						name: departments.name,
					},
					managerOrders: orders, // Здесь мы указываем таблицу orders для получения связанных данных
				})
				.from(users)
				.leftJoin(departments, eq(users.departmentId, departments.id))
				.leftJoin(orders, eq(users.id, orders.managerId))
				.where(finalWhere)
				.orderBy(orderBy)
				.limit(limit)
				.offset(skip);

			const total = await db
				.select({ count: sql`count(*)` })
				.from(users)
				.where(finalWhere);

			const mappedUsers = userList.map((u) => ({
				id: u.id,
				first_name: u.first_name ?? "",
				last_name: u.last_name ?? "",
				middle_name: u.middle_name ?? "",
				phone: u.phone,
				role: u.role,
				status: u.status,
				department:
					u.department && u.department.id
						? {
								id: u.department.id,
								name: u.department.name || "",
						  }
						: null,
				orders: Array.isArray(u.managerOrders)
					? u.managerOrders.map((o: any) => ({
							id: o.id,
							title: o.title,
					  }))
					: [],
			}));

			return NextResponse.json({ users: mappedUsers, total: total[0].count });
		} catch (err) {
			console.error("Ошибка при получении пользователей:", err);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"view_orders",
	["superadmin", "admin", "manager"]
);
