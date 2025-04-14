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
		console.log("token:", token);
		if (token) {
			// Декодировать токен и проверить роль
			const userRole = JSON.parse(atob(token.split(".")[1])).role;
			// Если роль — один из администраторов, перенаправить в /admin/dashboard
			if (userRole === "superadmin" || userRole === "admin" || userRole === "manager") {
				return NextResponse.redirect(new URL("/admin/dashboard", request.url));
			}
		}
		return NextResponse.next();
	}

	// Остальной админ-доступ — только с токеном и ролями superadmin, admin или manager
	if (!token || !["superadmin", "admin", "manager"].includes(JSON.parse(atob(token.split(".")[1])).role)) {
		return NextResponse.redirect(new URL("/admin", request.url));
	}

	return NextResponse.next();
}
