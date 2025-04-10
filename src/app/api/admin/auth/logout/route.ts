// src\app\api\admin\auth\logout\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
	// ⬇️ используем await
	const cookieStore = await cookies();

	// Удаляем куку
	cookieStore.delete("authToken");

	return NextResponse.json({ message: "Вы вышли из системы" });
}
