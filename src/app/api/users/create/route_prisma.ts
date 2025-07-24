import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logUserChange } from "@/lib/logUserChange";

export async function POST(request: NextRequest) {
	try {
		// Получаем данные из запроса
		const data = await request.json();
		const { first_name, last_name, middle_name, phone, role, status, departmentId, adminId } = data;

		// Проверка обязательных полей
		if (!phone) {
			return NextResponse.json({ error: "Номер телефона обязателен" }, { status: 400 });
		}

		if (!adminId) {
			return NextResponse.json({ error: "ID администратора обязателен" }, { status: 400 });
		}

		// Проверка формата телефона
		if (!phone.match(/^\+?[0-9]{10,15}$/)) {
			return NextResponse.json({ error: "Некорректный формат номера телефона" }, { status: 400 });
		}

		// Проверка на существование пользователя с таким телефоном
		const existingUser = await prisma.user.findUnique({
			where: { phone },
		});

		if (existingUser) {
			return NextResponse.json({ error: "Пользователь с таким номером телефона уже существует" }, { status: 400 });
		}

		// Создание пользователя
		const newUser = await prisma.user.create({
			data: {
				first_name: first_name || null,
				last_name: last_name || null,
				middle_name: middle_name || null,
				phone,
				password: Math.random().toString(36).slice(-8), // Генерируем временный пароль
				role: role || "client",
				status: status || "unverified",
				// Если указан departmentId и роль позволяет, создаем связь с отделом
				...(departmentId && role !== "client" && role !== "superadmin"
					? {
							department: {
								connect: {
									id: departmentId,
								},
							},
					  }
					: {}),
			},
			include: {
				department: true,
			},
		});

		// Логируем создание пользователя
		await logUserChange({
			targetUserId: newUser.id,
			adminId: adminId,
			action: "create",
			message: `Создание пользователя: ${newUser.phone} (${newUser.role})`,
			afterData: newUser,
		});

		// Возвращаем созданного пользователя
		return NextResponse.json(newUser, { status: 201 });
	} catch (error) {
		console.error("Ошибка при создании пользователя:", error);
		return NextResponse.json({ error: "Ошибка при создании пользователя" }, { status: 500 });
	}
}
