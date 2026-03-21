// Опционально извлекает id клиента из JWT в cookie запроса (для публичных POST без обязательной авторизации)

import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import type { Role } from "@/lib/rolesConfig";

type JwtPayload = {
	id: number;
	role: Role;
};

/**
 * Если в запросе есть валидный authToken и роль client — возвращаем user id.
 * Иначе null (гость оформляет заявку как раньше).
 */
export function getOptionalClientUserIdFromRequest(req: NextRequest): number | null {
	const token = req.cookies.get("authToken")?.value;
	if (!token || !process.env.JWT_SECRET) {
		return null;
	}
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
		if (payload.role !== "client" || typeof payload.id !== "number") {
			return null;
		}
		return payload.id;
	} catch {
		return null;
	}
}
