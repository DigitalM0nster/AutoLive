// src/app/api/departments/[departmentId]/users/route.ts
import { db } from "@/drizzle/db";
import { users, departments } from "@/drizzle/schema";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { eq, inArray, and, or, isNull } from "drizzle-orm";

// Получение списка пользователей, доступных для добавления в отдел
export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/")[3]);
		if (isNaN(departmentId)) {
			return NextResponse.json({ error: "Некорректный ID отдела" }, { status: 400 });
		}
		try {
			// Получаем всех пользователей с ролями admin и manager
			const allUsers = await db
				.select({
					id: users.id,
					first_name: users.firstName,
					last_name: users.lastName,
					phone: users.phone,
					role: users.role,
					departmentId: users.departmentId,
				})
				.from(users)
				.where(inArray(users.role, ["admin", "manager"]))
				.orderBy(users.departmentId);
			// Группируем пользователей
			const availableUsers = allUsers.filter((u) => !u.departmentId);
			const occupiedUsers = allUsers.filter((u) => u.departmentId !== null);
			return NextResponse.json({ availableUsers, occupiedUsers });
		} catch (err) {
			console.error("Ошибка загрузки пользователей:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_departments",
	["superadmin", "admin", "manager"]
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
			const usersToAdd = await db
				.select({ id: users.id, role: users.role, departmentId: users.departmentId })
				.from(users)
				.where(and(inArray(users.id, userIds), inArray(users.role, ["admin", "manager"]), or(isNull(users.departmentId), eq(users.departmentId, departmentId))));
			if (usersToAdd.length !== userIds.length) {
				return NextResponse.json({ error: "Некоторые пользователи недоступны для добавления" }, { status: 400 });
			}
			// Только суперадмин может добавлять администраторов
			const hasAdmins = usersToAdd.some((u) => u.role === "admin");
			if (hasAdmins && user.role !== "superadmin") {
				return NextResponse.json({ error: "Только суперадмин может добавлять администраторов" }, { status: 403 });
			}
			// Обновляем departmentId для выбранных пользователей
			await db.update(users).set({ departmentId }).where(inArray(users.id, userIds));
			// Получаем обновленный список пользователей отдела
			const updatedUsers = await db
				.select({
					id: users.id,
					first_name: users.firstName,
					last_name: users.lastName,
					role: users.role,
					phone: users.phone,
				})
				.from(users)
				.where(and(eq(users.departmentId, departmentId), inArray(users.role, ["admin", "manager"])));
			return NextResponse.json({ users: updatedUsers });
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
			const userToRemoveArr = await db
				.select({ id: users.id, role: users.role })
				.from(users)
				.where(and(eq(users.id, userId), eq(users.departmentId, departmentId)));
			const userToRemove = userToRemoveArr[0];
			if (!userToRemove) {
				return NextResponse.json({ error: "Пользователь не найден в этом отделе" }, { status: 404 });
			}
			// Только суперадмин может удалять администраторов
			if (userToRemove.role === "admin" && user.role !== "superadmin") {
				return NextResponse.json({ error: "Только суперадмин может удалять администраторов" }, { status: 403 });
			}
			// Удаляем пользователя из отдела
			await db.update(users).set({ departmentId: null }).where(eq(users.id, userId));
			return NextResponse.json({ success: true });
		} catch (err) {
			console.error("Ошибка при удалении пользователя из отдела:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin", "admin"]
);
