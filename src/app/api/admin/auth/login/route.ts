// src\app\api\admin\auth\login\route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ используем общий клиент
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
	const { phone, password } = await req.json();

	const user = await prisma.user.findUnique({
		where: { phone },
	});

	if (!user || !["superadmin", "admin", "manager"].includes(user.role)) {
		return NextResponse.json({ error: "Пользователь не найден или не админ" }, { status: 401 });
	}

	const isCorrect = await bcrypt.compare(password, user.password);

	if (!isCorrect) {
		return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
	}

	const token = jwt.sign(
		{
			id: user.id,
			name: `${user.first_name} ${user.last_name}`,
			phone: user.phone,
			role: user.role,
			departmentId: user.departmentId ?? null,
		},
		process.env.JWT_SECRET!,
		{ expiresIn: "7d" }
	);

	const res = NextResponse.json({ message: "Успешный вход" });

	res.cookies.set("authToken", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	console.log("Создаём authToken с ролью:", user.role);

	return res;
}
