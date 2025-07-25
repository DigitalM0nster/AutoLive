import { db } from "@/drizzle/db";
import { users, departments } from "@/drizzle/schema";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { logUserChange } from "@/lib/logUserChange";
import { eq } from "drizzle-orm";

// Обработчик для обновления данных пользователя
async function updateUserHandler(req: NextRequest, context: { user: any; scope: "all" | "department" | "own" }, params: { userId: string }) {
	try {
		const { user, scope } = context;
		const userId = parseInt(params.userId, 10);

		if (isNaN(userId)) {
			return NextResponse.json({ error: "Некорректный ID пользователя" }, { status: 400 });
		}

		const targetUserArr = await db
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
			})
			.from(users)
			.leftJoin(departments, eq(users.departmentId, departments.id))
			.where(eq(users.id, userId));
		const targetUser = targetUserArr[0];
		if (!targetUser) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		let canUpdate = false;
		let canUpdateRole = false;
		let canUpdateDepartment = false;
		let canUpdateStatus = false;
		let canUpdateName = false;
		if (user.role === "superadmin") {
			canUpdate = true;
			canUpdateRole = true;
			canUpdateDepartment = true;
			canUpdateStatus = true;
			canUpdateName = true;
		} else if (user.role === "admin" && user.departmentId) {
			if ((targetUser.role === "manager" && (targetUser.departmentId === user.departmentId || targetUser.departmentId === null)) || targetUser.role === "client") {
				canUpdate = true;
				canUpdateStatus = true;
				canUpdateName = true;
				if (targetUser.role === "manager" || targetUser.role === "client") {
					canUpdateRole = true;
				}
				if (targetUser.role === "manager" && targetUser.departmentId === null) {
					canUpdateDepartment = true;
				}
			}
		} else if (user.role === "manager") {
			if (targetUser.role === "client") {
				canUpdate = true;
				canUpdateStatus = true;
				canUpdateName = true;
			}
		}
		if (!canUpdate) {
			return NextResponse.json({ error: "Недостаточно прав для обновления данных пользователя" }, { status: 403 });
		}

		let data: any = {};
		if (req.headers.get("content-type")?.includes("application/json")) {
			data = await req.json();
		} else {
			return NextResponse.json({ error: "Только JSON поддерживается для обновления пользователя" }, { status: 400 });
		}

		const updateData: any = {};

		if (canUpdateName) {
			if (data.first_name !== undefined) updateData.firstName = data.first_name;
			if (data.last_name !== undefined) updateData.lastName = data.last_name;
			if (data.middle_name !== undefined) updateData.middleName = data.middle_name;
		}
		if (canUpdateRole) {
			if (data.role !== undefined) {
				if (data.role === "superadmin") {
					return NextResponse.json({ error: "Невозможно назначить роль суперадмина" }, { status: 403 });
				}
				if (user.role === "admin" && (data.role === "superadmin" || data.role === "admin")) {
					return NextResponse.json({ error: "Недостаточно прав для установки данной роли" }, { status: 403 });
				}
				updateData.role = data.role;
				if (data.role === "client" || data.role === "superadmin") {
					updateData.departmentId = null;
				}
			}
		}
		if (canUpdateStatus && data.status !== undefined) {
			updateData.status = data.status;
		}
		if (canUpdateDepartment && data.departmentId !== undefined) {
			updateData.departmentId = data.departmentId === null || data.departmentId === "" ? null : data.departmentId;
			if (targetUser.role === "client" || targetUser.role === "superadmin" || data.role === "client" || data.role === "superadmin") {
				updateData.departmentId = null;
			}
			if (user.role === "admin" && updateData.departmentId !== null) {
				if (updateData.departmentId != user.departmentId) {
					return NextResponse.json({ error: "Вы можете добавить менеджера только в свой отдел" }, { status: 403 });
				}
			}
		}

		if (Object.keys(updateData).length === 0) {
			return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });
		}

		const logMessage = `Обновление пользователя: ${targetUser.first_name || ""} ${targetUser.last_name || ""} (${targetUser.phone})`;

		await db.update(users).set(updateData).where(eq(users.id, userId));

		const updatedUserArr = await db
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
		const updatedUser = updatedUserArr[0];

		await logUserChange({
			targetUserId: userId,
			adminId: user.id,
			action: "update",
			message: logMessage,
			beforeData: targetUser,
			afterData: updatedUser,
		});

		const response = {
			id: updatedUser.id,
			first_name: updatedUser.first_name,
			last_name: updatedUser.last_name,
			middle_name: updatedUser.middle_name,
			phone: updatedUser.phone,
			role: updatedUser.role,
			status: updatedUser.status,
			department:
				updatedUser.department && updatedUser.department.id
					? {
							id: updatedUser.department.id,
							name: updatedUser.department.name,
					  }
					: null,
		};

		return NextResponse.json(response);
	} catch (err) {
		console.error("Ошибка при обновлении данных пользователя:", err);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

export const PUT = withPermission(
	async (req: NextRequest, context: { user: any; scope: "all" | "department" | "own" }) => {
		const userId = req.nextUrl.pathname.split("/")[3];
		return updateUserHandler(req, context, { userId });
	},
	"view_orders",
	["superadmin", "admin", "manager"]
);
