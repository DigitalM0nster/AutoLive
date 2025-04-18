// src\app\api\admin\profile\update\route.tsx

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { writeFile } from "fs/promises";
import path from "path";

type Decoded = {
	id: number;
	role: string;
	phone: string;
	departmentId?: number;
	iat: number;
	exp: number;
};

export async function POST(req: NextRequest) {
	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value;

	if (!token) return NextResponse.json({ message: "Нет токена" }, { status: 401 });

	let user: Decoded;
	try {
		user = jwt.verify(token, process.env.JWT_SECRET!) as Decoded;
	} catch {
		return NextResponse.json({ message: "Невалидный токен" }, { status: 403 });
	}

	const formData = await req.formData();
	const first_name = formData.get("first_name") as string;
	const last_name = formData.get("last_name") as string;
	const phone = formData.get("phone") as string;
	const currentPassword = formData.get("currentPassword") as string;
	const newPassword = formData.get("newPassword") as string;
	const avatarFile = formData.get("avatar") as File | null;

	const dataToUpdate: any = { first_name, last_name, phone };

	// обработка аватара
	const removeAvatar = formData.get("removeAvatar");

	if (avatarFile) {
		const bytes = await avatarFile.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const fileName = `avatar_${user.id}_${Date.now()}.${avatarFile.name.split(".").pop()}`;
		const filePath = path.join(process.cwd(), "public", "uploads", fileName);
		await writeFile(filePath, buffer);
		dataToUpdate.avatar = `/uploads/${fileName}`;
	} else if (removeAvatar === "true") {
		dataToUpdate.avatar = null;
	}

	// обработка пароля
	if (currentPassword && newPassword) {
		const admin = await prisma.user.findUnique({ where: { id: user.id } });
		if (!admin || !(await bcrypt.compare(currentPassword, admin.password))) {
			return NextResponse.json({ message: "Текущий пароль неверен" }, { status: 400 });
		}
		const hashed = await bcrypt.hash(newPassword, 10);
		dataToUpdate.password = hashed;
	}

	await prisma.user.update({
		where: { id: user.id },
		data: dataToUpdate,
	});

	return NextResponse.json({ message: "Профиль обновлён" });
}
