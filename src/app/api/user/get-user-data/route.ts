// src/app/api/user/get-user-data/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { Role } from "@/lib/rolesConfig";

type DecodedToken = {
	id: number;
	role: Role;
	name: string;
	phone: string;
	status: "verified" | "unverified";
	iat: number;
	exp: number;
};

export async function GET() {
	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value;

	if (!token) return NextResponse.json({ error: "Нет токена" }, { status: 401 });

	try {
		const user = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

		if (user.role !== "client") {
			return NextResponse.json({ error: "Доступ только для клиентов" }, { status: 403 });
		}

		return NextResponse.json({
			id: user.id,
			name: user.name,
			role: user.role,
			phone: user.phone,
			status: user.status,
		});
	} catch {
		return NextResponse.json({ error: "Невалидный токен" }, { status: 403 });
	}
}
