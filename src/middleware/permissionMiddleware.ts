import { hasPermission, Role, Permission } from "@/lib/rolesConfig";
import { getUserFromRequest } from "@/middleware/authMiddleware";
import { NextRequest, NextResponse } from "next/server";

export function withPermission(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>, requiredPermission: Permission, allowedRoles: Role[] = []) {
	return async (req: NextRequest, ...args: any[]) => {
		const { user, error, status } = await getUserFromRequest(req, allowedRoles);

		if (!user) {
			return NextResponse.json({ error }, { status });
		}

		// Дополнительно проверим конкретное право
		if (!user.role || !hasPermission(user.role as Role, requiredPermission)) {
			return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
		}

		// Всё ок — вызываем основной обработчик
		return handler(req, ...args);
	};
}
