// Проверка JWT из cookie: личный кабинет на сайте (клиенты и сотрудники)

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { Role } from "@/lib/rolesConfig";
import { canAccessSiteProfile } from "@/lib/siteProfileAccess";

type JwtPayload = {
	id: number;
	role: Role;
	phone?: string;
	status?: string;
};

export type ClientSessionOk = { userId: number };
export type ClientSessionErr = { error: string; status: number };

/**
 * Возвращает id пользователя, если в cookie валидный токен и роль допускает ЛК на сайте.
 */
export async function requireClientSession(): Promise<ClientSessionOk | ClientSessionErr> {
	const token = (await cookies()).get("authToken")?.value;
	if (!token) {
		return { error: "Требуется войти в аккаунт", status: 401 };
	}
	if (!process.env.JWT_SECRET) {
		return { error: "Ошибка сервера", status: 500 };
	}
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
		if (!canAccessSiteProfile(payload.role)) {
			return { error: "Раздел недоступен для вашей роли", status: 403 };
		}
		return { userId: payload.id };
	} catch {
		return { error: "Сессия недействительна", status: 401 };
	}
}
