// src\app\api\departments\route.ts

import { db } from "@/drizzle/db";
import { departments, departmentCategories } from "@/drizzle/schema";
import { withPermission } from "@/middleware/permissionMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

// ✅ Получение списка отделов
export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			// Получаем все отделы (id и name) через Drizzle
			const result = await db.select({ id: departments.id, name: departments.name }).from(departments);
			return NextResponse.json(result);
		} catch (err) {
			console.error("Ошибка загрузки отделов:", err);
			return NextResponse.json("Ошибка сервера", { status: 500 });
		}
	},
	"view_departments",
	["superadmin", "admin", "manager"]
);

// ✅ Создание нового отдела
export const POST = withPermission(
	async (req: NextRequest) => {
		try {
			const body = await req.json();
			const { name, categoryIds } = body;

			if (!name || !Array.isArray(categoryIds)) {
				return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
			}

			// 1. Создаём отдел и получаем его id
			const departmentIdArr = await db.insert(departments).values({ name }).$returningId();
			// Drizzle может вернуть массив объектов или чисел, берём id корректно
			const departmentId = typeof departmentIdArr[0] === "object" ? departmentIdArr[0].id : departmentIdArr[0];

			// 2. Привязываем категории к отделу через departmentCategories
			if (categoryIds.length > 0) {
				await db.insert(departmentCategories).values(
					categoryIds.map((categoryId: number) => ({
						departmentId: departmentId, // просто число
						categoryId,
					}))
				);
			}

			// 3. Можно получить отдел с категориями, если нужно (доп. запрос)
			// Здесь возвращаем только созданный отдел (id и name)
			return NextResponse.json({ id: departmentId, name });
		} catch (error) {
			console.error("Ошибка при создании отдела:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin"]
);
