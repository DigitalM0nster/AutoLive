import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

type Role = "manager" | "admin" | "superadmin";

type DecodedToken = {
	id: number;
	role: Role;
	name: string;
	phone: string;
	iat: number;
	exp: number;
};

// 👇 Утилита для проверки токена и роли
export async function getUserFromRequest(req: NextRequest, allowedRoles: Role[] = []): Promise<{ user?: DecodedToken; error?: string; status?: number }> {
	try {
		const authHeader = req.headers.get("Authorization");
		if (!authHeader) {
			return { error: "Нет доступа", status: 401 };
		}

		const token = authHeader.split(" ")[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

		if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
			return { error: "Недостаточно прав", status: 403 };
		}

		return { user: decoded };
	} catch (error) {
		return { error: "Неверный токен", status: 401 };
	}
}
