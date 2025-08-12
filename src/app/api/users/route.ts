import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import type { User } from "@/lib/types";
import { logUserChange, logDepartmentChange } from "@/lib/universalLogging";

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

			// Добавляем фильтрацию по роли (поддерживаем множественные роли)
			const roleParams = searchParams.getAll("role");
			if (roleParams.length > 0) {
				// Фильтруем только валидные роли
				const validRoles = roleParams.filter((role) => ["superadmin", "admin", "manager", "client"].includes(role));
				if (validRoles.length > 0) {
					where.role = { in: validRoles };
				}
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

export const POST = withPermission(
	async (request: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			// Получаем данные из запроса
			const data = await request.json();
			const { first_name, last_name, middle_name, phone, role, status, departmentId } = data;

			// Проверка обязательных полей
			if (!phone) {
				return NextResponse.json({ error: "Номер телефона обязателен" }, { status: 400 });
			}

			// Проверка формата телефона
			if (!phone.match(/^\+?[0-9]{10,15}$/)) {
				return NextResponse.json({ error: "Некорректный формат номера телефона" }, { status: 400 });
			}

			// Проверка на существование пользователя с таким телефоном
			const existingUser = await prisma.user.findUnique({
				where: { phone },
			});

			if (existingUser) {
				return NextResponse.json({ error: "Пользователь с таким номером телефона уже существует" }, { status: 400 });
			}

			// Создание пользователя
			const newUser = await prisma.user.create({
				data: {
					first_name: first_name || null,
					last_name: last_name || null,
					middle_name: middle_name || null,
					phone,
					password: Math.random().toString(36).slice(-8), // Генерируем временный пароль
					role: role || "client",
					status: status || "unverified",
					// Если указан departmentId и роль позволяет, создаем связь с отделом
					...(departmentId && role !== "client" && role !== "superadmin"
						? {
								department: {
									connect: {
										id: departmentId,
									},
								},
						  }
						: {}),
				},
				include: {
					department: true,
				},
			});

			// Логируем создание пользователя
			await logUserChange({
				entityId: newUser.id, // Передаем ID созданного пользователя
				adminId: user.id,
				message: `Создание пользователя: ${newUser.phone} (${newUser.role})`,
				afterData: newUser,
				actions: ["create"], // ✅ Создание пользователя
			});

			// Если пользователь добавлен в отдел, логируем изменение отдела
			if (departmentId && newUser.department) {
				await logDepartmentChange({
					entityId: departmentId,
					adminId: user.id,
					message: `Добавление пользователя ${newUser.phone} в отдел ${newUser.department.name}`,
					afterData: newUser.department, // Полные данные отдела с новым пользователем
					actions: ["add_employees"], // ✅ 2. Добавление сотрудников
				});
			}

			// Возвращаем созданного пользователя
			return NextResponse.json(newUser, { status: 201 });
		} catch (error) {
			console.error("Ошибка при создании пользователя:", error);
			return NextResponse.json({ error: "Ошибка при создании пользователя" }, { status: 500 });
		}
	},
	"create_users",
	["superadmin", "admin"]
);
