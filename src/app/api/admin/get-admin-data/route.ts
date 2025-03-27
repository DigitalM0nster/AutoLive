// src/app/api/admin/get-admin-data/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { Role, ROLE_PERMISSIONS, Permission } from "@/lib/rolesConfig";

type Decoded = {
	id: number;
	role: Role;
	name: string;
	phone: string;
	iat: number;
	exp: number;
};

export async function GET() {
	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value;

	if (!token) return NextResponse.json({ error: "Нет токена" }, { status: 401 });

	try {
		const user = jwt.verify(token, process.env.JWT_SECRET!) as Decoded;

		if (!["superadmin", "admin", "manager"].includes(user.role)) {
			return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
		}

		const permissions: Permission[] = ROLE_PERMISSIONS[user.role] || [];

		return NextResponse.json({
			id: user.id,
			name: user.name,
			role: user.role,
			permissions,
		});
	} catch {
		return NextResponse.json({ error: "Невалидный токен" }, { status: 403 });
	}
}
