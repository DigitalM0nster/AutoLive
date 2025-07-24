import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { users, departments } from "@/drizzle/schema";
import { logUserChange } from "@/lib/logUserChange";
import { eq } from "drizzle-orm";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
	try {
		// Проверяем тип контента: multipart/form-data для загрузки файла
		const contentType = request.headers.get("content-type") || "";
		let data: any = {};
		let avatarPath = null;

		if (contentType.includes("multipart/form-data")) {
			// Получаем formData
			const formData = await request.formData();
			// Извлекаем поля
			data.first_name = formData.get("first_name");
			data.last_name = formData.get("last_name");
			data.middle_name = formData.get("middle_name");
			data.phone = formData.get("phone");
			data.role = formData.get("role");
			data.status = formData.get("status");
			data.departmentId = formData.get("departmentId");
			data.adminId = formData.get("adminId");
		} else {
			// Если не multipart — обычный JSON
			data = await request.json();
		}

		const { first_name, last_name, middle_name, phone, role, status, departmentId, adminId } = data;

		// Проверка обязательных полей
		if (!phone) {
			return NextResponse.json({ error: "Номер телефона обязателен" }, { status: 400 });
		}
		if (!adminId) {
			return NextResponse.json({ error: "ID администратора обязателен" }, { status: 400 });
		}
		if (!phone.match(/^\+?[0-9]{10,15}$/)) {
			return NextResponse.json({ error: "Некорректный формат номера телефона" }, { status: 400 });
		}

		// Проверка на существование пользователя с таким телефоном
		const existingUser = await db.select().from(users).where(eq(users.phone, phone));
		if (existingUser.length > 0) {
			return NextResponse.json({ error: "Пользователь с таким номером телефона уже существует" }, { status: 400 });
		}

		// Формируем данные для вставки
		const userData: any = {
			firstName: first_name || null,
			lastName: last_name || null,
			middleName: middle_name || null,
			phone,
			password: Math.random().toString(36).slice(-8), // Генерируем временный пароль
			role: role || "client",
			status: status || "unverified",
		};
		if (departmentId && role !== "client" && role !== "superadmin") {
			userData.departmentId = departmentId;
		}

		// Создание пользователя
		const insertedIds = await db.insert(users).values(userData).$returningId();
		const userId = typeof insertedIds[0] === "object" ? insertedIds[0].id : insertedIds[0];

		// Получаем созданного пользователя с отделом через leftJoin
		const createdUserArr = await db
			.select({
				id: users.id,
				phone: users.phone,
				firstName: users.firstName,
				lastName: users.lastName,
				middleName: users.middleName,
				role: users.role,
				status: users.status,
				department: {
					id: departments.id,
					name: departments.name,
				},
			})
			.from(users)
			.leftJoin(departments, eq(users.departmentId, departments.id))
			.where(eq(users.id, userId));
		const newUser = createdUserArr[0];

		// Логируем создание пользователя
		await logUserChange({
			targetUserId: newUser.id,
			adminId: adminId,
			action: "create",
			message: `Создание пользователя: ${newUser.phone} (${newUser.role})`,
			afterData: newUser,
		});

		// Возвращаем созданного пользователя с отделом
		return NextResponse.json(newUser, { status: 201 });
	} catch (error) {
		console.error("Ошибка при создании пользователя:", error);
		return NextResponse.json({ error: "Ошибка при создании пользователя" }, { status: 500 });
	}
}
