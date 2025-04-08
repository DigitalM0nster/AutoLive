// src/middleware/authMiddleware.ts

import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

type Role = "manager" | "admin" | "superadmin" | "client";

type DecodedToken = {
	id: number;
	role: Role;
	name?: string;
	phone: string;
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
