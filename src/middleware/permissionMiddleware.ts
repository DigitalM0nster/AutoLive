// src\middleware\permissionMiddleware.ts

import { hasPermission, Role, Permission } from "@/lib/rolesConfig";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

type DecodedToken = {
	id: number;
	role: Role;
	name?: string;
	phone: string;
	departmentId?: number;
	iat: number;
	exp: number;
};

export async function getUserFromRequest(req: NextRequest, allowedRoles: Role[] = []): Promise<{ user?: DecodedToken; error?: string; status?: number }> {
	try {
		const token = req.cookies.get("authToken")?.value;

		if (!token) {
			return { error: "Нет доступа", status: 401 };
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

		if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
			return { error: "Недостаточно прав", status: 403 };
		}

		return { user: decoded };
	} catch (error) {
		return { error: "Неверный токен", status: 401 };
	}
}

export function withPermission(
	handler: (req: NextRequest, context: { user: any; scope: "all" | "department" | "own"; params: any }) => Promise<NextResponse>,
	requiredPermission: Permission,
	allowedRoles: Role[] = []
) {
	return async (req: NextRequest, context: { params: any }): Promise<NextResponse> => {
		const { user, error, status } = await getUserFromRequest(req, allowedRoles);

		if (!user) {
			return NextResponse.json({ error }, { status });
		}

		const permission = hasPermission(user.role as Role, requiredPermission);

		if (!permission) {
			return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
		}

		// Всё ок — вызываем основной обработчик и передаём scope и параметры
		return handler(req, { user, scope: permission.scope, params: context.params });
	};
}
