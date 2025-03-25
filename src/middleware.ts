import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
	matcher: ["/admin/:path*"], // только для /admin и вложенных
};

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Только для роутов начинающихся с /admin
	if (pathname.startsWith("/admin")) {
		const token = request.cookies.get("authToken")?.value;

		// Если токена нет — редирект на login
		if (!token) {
			const loginUrl = new URL("/login", request.url);
			return NextResponse.redirect(loginUrl);
		}
	}

	return NextResponse.next();
}
