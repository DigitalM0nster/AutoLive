// src/middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
	matcher: ["/admin/:path*"],
};

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get("authToken")?.value;

	// Исключение для страницы восстановления пароля
	if (pathname.startsWith("/admin/reset-password")) {
		return NextResponse.next();
	}

	// Если пользователь на /admin (форма логина)
	if (pathname === "/admin") {
		if (token) {
			try {
				// Проверяем, что токен имеет правильный формат JWT (3 части разделенные точками)
				const tokenParts = token.split(".");
				if (tokenParts.length !== 3) {
					return NextResponse.next();
				}

				// Декодировать JWT payload (используем base64url декодирование)
				const payload = tokenParts[1];
				// Заменяем base64url символы на обычные base64
				const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
				// Добавляем padding если нужно
				const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

				const userRole = JSON.parse(atob(padded)).role;

				// Если роль — один из администраторов, перенаправить в /admin/dashboard
				if (userRole === "superadmin" || userRole === "admin" || userRole === "manager") {
					return NextResponse.redirect(new URL("/admin/dashboard", request.url));
				}
			} catch (error) {
				// Если токен поврежден, удаляем его
				const response = NextResponse.next();
				response.cookies.delete("authToken");
				return response;
			}
		}
		return NextResponse.next();
	}

	// Остальной админ-доступ — только с токеном и ролями superadmin, admin или manager
	if (!token) {
		return NextResponse.redirect(new URL("/admin", request.url));
	}

	try {
		// Проверяем, что токен имеет правильный формат JWT (3 части разделенные точками)
		const tokenParts = token.split(".");
		if (tokenParts.length !== 3) {
			return NextResponse.redirect(new URL("/admin", request.url));
		}

		// Декодировать JWT payload (используем base64url декодирование)
		const payload = tokenParts[1];
		// Заменяем base64url символы на обычные base64
		const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
		// Добавляем padding если нужно
		const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

		const userRole = JSON.parse(atob(padded)).role;

		if (!["superadmin", "admin", "manager"].includes(userRole)) {
			return NextResponse.redirect(new URL("/admin", request.url));
		}
	} catch (error) {
		// Если токен поврежден, удаляем его и перенаправляем на логин
		const response = NextResponse.redirect(new URL("/admin", request.url));
		response.cookies.delete("authToken");
		return response;
	}

	return NextResponse.next();
}
