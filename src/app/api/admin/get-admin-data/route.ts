// src\app\api\admin\get-admin-data\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { Role, ROLE_PERMISSIONS, Permission } from "@/lib/rolesConfig";
import { prisma } from "@/lib/prisma"; // ✅ обязательно проверь алиас

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

		// Загружаем админа из БД
		const admin = await prisma.user.findUnique({
			where: { id: user.id },
			select: {
				id: true,
				first_name: true,
				last_name: true,
				phone: true,
				avatar: true,
				role: true,
			},
		});

		if (!admin) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		const permissions: Permission[] = ROLE_PERMISSIONS[admin.role] || [];

		return NextResponse.json({
			...admin,
			permissions,
		});
	} catch {
		return NextResponse.json({ error: "Невалидный токен" }, { status: 403 });
	}
}
