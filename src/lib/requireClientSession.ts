// Проверка JWT из cookie: только роль client (личный кабинет на сайте)

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { Role } from "@/lib/rolesConfig";

type JwtPayload = {
	id: number;
	role: Role;
	phone?: string;
	status?: string;
};

export type ClientSessionOk = { userId: number };
export type ClientSessionErr = { error: string; status: number };

/**
 * Возвращает id пользователя, если в cookie валидный токен и роль client.
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
		if (payload.role !== "client") {
			return { error: "Раздел доступен только клиентам магазина", status: 403 };
		}
		return { userId: payload.id };
	} catch {
		return { error: "Сессия недействительна", status: 401 };
	}
}
