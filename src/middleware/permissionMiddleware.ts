// src\middleware\permissionMiddleware.ts

import { hasPermission, Role, Permission } from "@/lib/rolesConfig";
import { getUserFromRequest } from "@/middleware/authMiddleware";
import { NextRequest, NextResponse } from "next/server";

export function withPermission(
	handler: (req: NextRequest, context: { user: any; scope: "all" | "department" | "own" }) => Promise<NextResponse>,
	requiredPermission: Permission,
	allowedRoles: Role[] = []
) {
	return async (req: NextRequest): Promise<NextResponse> => {
		const { user, error, status } = await getUserFromRequest(req, allowedRoles);

		if (!user) {
			return NextResponse.json({ error }, { status });
		}

		const permission = hasPermission(user.role as Role, requiredPermission);

		if (!permission) {
			return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
		}

		// Всё ок — вызываем основной обработчик и передаём scope
		return handler(req, { user, scope: permission.scope });
	};
}
