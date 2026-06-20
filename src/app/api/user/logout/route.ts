// src\app\api\user\auth\logout\route.ts

import { NextResponse } from "next/server";

export async function POST() {
	const response = NextResponse.json({ message: "Вы вышли из системы" });

	response.cookies.set("authToken", "", {
		httpOnly: true,
		expires: new Date(0),
		path: "/",
	});

	return response;
}
