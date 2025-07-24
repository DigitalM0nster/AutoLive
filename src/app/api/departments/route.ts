// src\app\api\departments\route.ts

import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { NextRequest, NextResponse } from "next/server";

// ✅ Получение списка отделов
export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			// Все пользователи (суперадмины, админы и менеджеры) могут видеть все отделы
			const departments = await prisma.department.findMany({
				select: { id: true, name: true },
			});
			return NextResponse.json(departments);
		} catch (err) {
			console.error("Ошибка загрузки отделов:", err);
			return NextResponse.json("Ошибка сервера", { status: 500 });
		}
	},
	"view_departments",
	["superadmin", "admin", "manager"] // Добавляем manager в список разрешенных ролей
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

			const department = await prisma.department.create({
				data: {
					name,
					allowedCategories: {
						create: categoryIds.map((categoryId: number) => ({ categoryId })),
					},
				},
				include: {
					allowedCategories: { include: { category: true } },
				},
			});

			return NextResponse.json(department);
		} catch (error) {
			console.error("Ошибка при создании отдела:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin"]
);
