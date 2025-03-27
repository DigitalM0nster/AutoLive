// src\middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
	matcher: ["/admin/:path*"], // работает на все /admin/...
};

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// 👇 Разрешаем доступ только на корень /admin (форма логина)
	if (pathname === "/admin") {
		return NextResponse.next();
	}

	// Всё остальное в /admin требует токена
	const token = request.cookies.get("authToken")?.value;

	if (!token) {
		return NextResponse.redirect(new URL("/admin", request.url));
	}

	return NextResponse.next();
}
