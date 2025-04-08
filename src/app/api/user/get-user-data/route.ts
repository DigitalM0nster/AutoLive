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
	status: "verified" | "unverified";
	iat: number;
	exp: number;
};

export async function GET() {
	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value;

	console.log("🔑 Получен токен:", token); // 💬 Проверка: токен вообще есть?

	if (!token) {
		console.log("⛔️ Нет токена");
		return NextResponse.json({ error: "Нет токена" }, { status: 401 });
	}

	try {
		const user = jwt.verify(token, process.env.JWT_SECRET!) as Decoded;
		console.log("✅ JWT расшифрован:", user);

		// ✅ допускаем все роли
		if (!["client", "user", "superadmin", "admin", "manager"].includes(user.role)) {
			return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
		}

		const dbUser = await prisma.user.findUnique({
			where: { id: user.id },
			select: {
				first_name: true,
				last_name: true,
			},
		});

		console.log("🧑 Пользователь в базе:", dbUser);

		const permissions: Permission[] = ROLE_PERMISSIONS[user.role] || [];

		return NextResponse.json({
			id: user.id,
			phone: user.phone,
			role: user.role,
			status: user.status,
			first_name: dbUser?.first_name ?? "",
			last_name: dbUser?.last_name ?? "",
			permissions,
		});
	} catch (e) {
		console.error("💥 Ошибка JWT:", e);
		return NextResponse.json({ error: "Невалидный токен" }, { status: 403 });
	}
}
