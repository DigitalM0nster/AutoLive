import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import type { User } from "@/lib/types";

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

			const where: any = {};

			// Добавляем поддержку поиска
			const searchQuery = searchParams.get("search");
			if (searchQuery) {
				// Проверяем, является ли поисковый запрос числом (ID пользователя)
				const isNumeric = /^\d+$/.test(searchQuery);

				if (isNumeric) {
					// Если запрос - число, ищем по ID или телефону
					where.OR = [{ id: parseInt(searchQuery, 10) }, { phone: { contains: searchQuery } }];
				} else {
					// Иначе ищем по ФИО или телефону
					where.OR = [
						{ first_name: { contains: searchQuery } },
						{ last_name: { contains: searchQuery } },
						{ middle_name: { contains: searchQuery } },
						{ phone: { contains: searchQuery } },
					];
				}
			}

			const statusParam = searchParams.get("status");
			if (statusParam === "verified" || statusParam === "unverified") {
				where.status = statusParam;
			}

			// Добавляем фильтрацию по роли
			const roleParam = searchParams.get("role");
			if (roleParam && ["superadmin", "admin", "manager", "client"].includes(roleParam)) {
				where.role = roleParam;
			}

			const departmentIdParam = searchParams.get("departmentId");
			const allUsersParam = searchParams.get("allUsers");
			const withoutDepartmentParam = searchParams.get("withoutDepartment");
			const showAllUsers = allUsersParam === "true";
			const showWithoutDepartment = withoutDepartmentParam === "true";

			// Фильтр для пользователей без отдела
			if (showWithoutDepartment) {
				where.departmentId = null;
			}
			// Если указан конкретный отдел, фильтруем по нему независимо от роли пользователя
			else if (departmentIdParam) {
				where.departmentId = parseInt(departmentIdParam, 10);
			}
			// Если запрошены все пользователи или пользователь имеет права
			else if (showAllUsers || user.role === "superadmin" || user.role === "admin") {
				// Не добавляем фильтр, показываем всех пользователей
				// Это позволяет админам видеть всех пользователей по умолчанию
			}
			// По умолчанию для менеджера показываем только его
			else if (user.role === "manager") {
				where.id = user.id;
			}

			const sortParam = searchParams.get("sortBy"); // "fullName"
			const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

			let orderBy: any = { createdAt: "desc" };

			if (sortParam === "fullName") {
				orderBy = [{ first_name: sortOrder }, { last_name: sortOrder }];
			} else if (sortParam === "phone") {
				orderBy = { phone: sortOrder };
			}

			const users = await prisma.user.findMany({
				where,
				include: {
					managerOrders: {
						select: {
							id: true,
							title: true,
						},
					},
					department: true,
				},
				skip,
				take: limit,
				orderBy,
			});

			const total = await prisma.user.count({ where });

			const mappedUsers = users.map((u) => ({
				id: u.id,
				first_name: u.first_name ?? "",
				last_name: u.last_name ?? "",
				middle_name: u.middle_name ?? "",
				phone: u.phone,
				role: u.role,
				status: u.status,
				department: u.department
					? {
							id: u.department.id,
							name: u.department.name,
					  }
					: null,
				orders: u.managerOrders.map((o) => ({
					id: o.id,
					title: o.title,
				})),
			}));

			return NextResponse.json({ users: mappedUsers, total });
		} catch (err) {
			console.error("Ошибка при получении пользователей:", err);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"view_orders",
	["superadmin", "admin", "manager"]
);
