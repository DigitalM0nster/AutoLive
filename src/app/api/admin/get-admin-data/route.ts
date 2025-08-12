// src\app\api\admin\get-admin-data\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { Role, ROLE_PERMISSIONS, Permission } from "@/lib/rolesConfig";
import { prisma } from "@/lib/prisma";

type Decoded = {
	id: number;
	role: Role;
	name: string;
	phone: string;
	iat: number;
	exp: number;
	departmentId?: number;
};

export async function GET() {
	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value; // 👈 используем authToken

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
				middle_name: true,
				phone: true,
				role: true,
				department: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!admin) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		const permissions: Permission[] = (ROLE_PERMISSIONS[admin.role] || []).map((p) => p.permission);

		return NextResponse.json({
			...admin,
			permissions,
		});
	} catch {
		return NextResponse.json({ error: "Невалидный токен" }, { status: 403 });
	}
}
