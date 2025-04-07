// src\middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
	matcher: ["/admin/:path*"],
};

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get("authToken")?.value;

	// Если пользователь на /admin (форма логина)
	if (pathname === "/admin") {
		// Если уже авторизован — перенаправляем в dashboard
		if (token) {
			return NextResponse.redirect(new URL("/admin/dashboard", request.url));
		}
		// Если не авторизован — показываем логин
		return NextResponse.next();
	}

	// Всё остальное требует токен
	if (!token) {
		return NextResponse.redirect(new URL("/admin", request.url));
	}

	return NextResponse.next();
}
