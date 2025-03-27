import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
	const cookieStore = await cookies();
	cookieStore.delete("userToken");

	return NextResponse.json({ message: "Вы вышли из системы" });
}
