// src/app/api/departments/[departmentId]/users/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

// Получение списка пользователей, доступных для добавления в отдел
export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/")[3]);

		if (isNaN(departmentId)) {
			return NextResponse.json({ error: "Некорректный ID отдела" }, { status: 400 });
		}

		// Удаляем проверку на принадлежность к отделу, чтобы все пользователи могли просматривать любые отделы
		try {
			// Получаем всех пользователей с ролями admin и manager
			const users = await prisma.user.findMany({
				where: {
					role: { in: ["admin", "manager"] },
				},
				select: {
					id: true,
					first_name: true,
					last_name: true,
					phone: true,
					role: true,
					departmentId: true,
					department: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: {
					departmentId: { sort: "asc", nulls: "first" },
				},
			});

			// Группируем пользователей на доступных и занятых
			// Доступные - только те, у кого нет departmentId (не привязаны ни к какому отделу)
			// Занятые - все, кто привязан к какому-либо отделу (включая текущий)
			const availableUsers = users.filter((u) => !u.departmentId);
			const occupiedUsers = users.filter((u) => u.departmentId !== null);

			return NextResponse.json({ availableUsers, occupiedUsers });
		} catch (err) {
			console.error("Ошибка загрузки пользователей:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_departments",
	["superadmin", "admin", "manager"] // Добавляем manager в список разрешенных ролей
);

// Добавление пользователей в отдел
export const POST = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			const body = await req.json();
			const departmentId = Number(req.nextUrl.pathname.split("/")[3]);
			const { userIds } = body;

			if (isNaN(departmentId) || !Array.isArray(userIds)) {
				return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
			}

			if (scope === "department" && user.departmentId !== departmentId) {
				return NextResponse.json({ error: "Нет доступа к этому отделу" }, { status: 403 });
			}

			// Проверяем, что все пользователи доступны для добавления
			const usersToAdd = await prisma.user.findMany({
				where: {
					id: { in: userIds },
					OR: [{ departmentId: null }, { departmentId: departmentId }],
				},
			});

			if (usersToAdd.length !== userIds.length) {
				return NextResponse.json(
					{
						error: "Некоторые пользователи недоступны для добавления",
					},
					{ status: 400 }
				);
			}

			// Проверяем права доступа для добавления администраторов
			// Только суперадмин может добавлять администраторов
			const hasAdmins = usersToAdd.some((u) => u.role === "admin");
			if (hasAdmins && user.role !== "superadmin") {
				return NextResponse.json(
					{
						error: "Только суперадмин может добавлять администраторов",
					},
					{ status: 403 }
				);
			}

			// Обновляем departmentId для выбранных пользователей
			await prisma.user.updateMany({
				where: { id: { in: userIds } },
				data: { departmentId },
			});

			// Получаем обновленный список пользователей отдела
			const updatedDepartment = await prisma.department.findUnique({
				where: { id: departmentId },
				select: {
					users: {
						where: {
							role: { in: ["admin", "manager"] },
						},
						select: {
							id: true,
							first_name: true,
							last_name: true,
							role: true,
							phone: true,
						},
					},
				},
			});

			return NextResponse.json({ users: updatedDepartment?.users || [] });
		} catch (err) {
			console.error("Ошибка при добавлении пользователей:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin", "admin"]
);

// Удаление пользователя из отдела
export const DELETE = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			const body = await req.json();
			const departmentId = Number(req.nextUrl.pathname.split("/")[3]);
			const { userId } = body;

			if (isNaN(departmentId) || !userId) {
				return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
			}

			if (scope === "department" && user.departmentId !== departmentId) {
				return NextResponse.json({ error: "Нет доступа к этому отделу" }, { status: 403 });
			}

			// Проверяем, что пользователь принадлежит этому отделу
			const userToRemove = await prisma.user.findFirst({
				where: {
					id: userId,
					departmentId: departmentId,
				},
			});

			if (!userToRemove) {
				return NextResponse.json(
					{
						error: "Пользователь не найден в этом отделе",
					},
					{ status: 404 }
				);
			}

			// Проверяем права доступа для удаления администраторов
			// Только суперадмин может удалять администраторов
			if (userToRemove.role === "admin" && user.role !== "superadmin") {
				return NextResponse.json(
					{
						error: "Только суперадмин может удалять администраторов",
					},
					{ status: 403 }
				);
			}

			// Удаляем пользователя из отдела
			await prisma.user.update({
				where: { id: userId },
				data: { departmentId: null },
			});

			return NextResponse.json({ success: true });
		} catch (err) {
			console.error("Ошибка при удалении пользователя из отдела:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin", "admin"]
);
