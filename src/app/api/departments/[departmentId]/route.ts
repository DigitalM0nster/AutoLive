// src\app\api\departments\[departmentId]\route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

// ✅ Получение одного отдела по ID
export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/").pop());

		if (isNaN(departmentId)) {
			return NextResponse.json({ error: "Некорректный ID отдела" }, { status: 400 });
		}

		// Удаляем проверку на принадлежность к отделу, чтобы все пользователи могли просматривать любые отделы
		try {
			const department = await prisma.department.findUnique({
				where: { id: departmentId },
				select: {
					id: true,
					name: true,
					allowedCategories: {
						select: {
							category: {
								select: { id: true, title: true },
							},
						},
					},
					users: {
						where: {
							role: { in: ["admin", "manager"] },
						},
						select: {
							id: true,
							first_name: true,
							last_name: true,
							role: true,
							phone: true,
						},
					},
					products: {
						select: {
							id: true,
							title: true,
							sku: true,
							brand: true,
							price: true,
						},
					},
					orders: {
						select: {
							id: true,
							title: true,
							status: true,
							createdAt: true,
						},
						orderBy: {
							createdAt: "desc",
						},
						take: 10,
					},
				},
			});

			if (!department) {
				return NextResponse.json({ error: "Отдел не найден" }, { status: 404 });
			}

			return NextResponse.json(department);
		} catch (err) {
			console.error("Ошибка загрузки отдела:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_departments",
	["superadmin", "admin", "manager"]
);

// ✅ Обновление отдела
export const PATCH = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			const body = await req.json();
			const departmentId = Number(req.nextUrl.pathname.split("/").pop());

			if (isNaN(departmentId)) {
				return NextResponse.json({ error: "Некорректный ID отдела" }, { status: 400 });
			}

			if (scope === "department" && user.departmentId !== departmentId) {
				return NextResponse.json({ error: "Нет доступа к этому отделу" }, { status: 403 });
			}

			const { name, categoryIds } = body;

			// Получаем старые разрешённые категории
			const prevDepartment = await prisma.department.findUnique({
				where: { id: departmentId },
				select: {
					allowedCategories: {
						select: { categoryId: true },
					},
				},
			});

			const prevCategoryIds = prevDepartment?.allowedCategories.map((c) => c.categoryId) || [];
			const removedCategoryIds = prevCategoryIds.filter((id) => !categoryIds.includes(id));

			// Обновляем отдел и список категорий
			const updated = await prisma.department.update({
				where: { id: departmentId },
				data: {
					name,
					allowedCategories: {
						deleteMany: {},
						create: categoryIds?.map((id: number) => ({ categoryId: id })) || [],
					},
				},
				include: {
					allowedCategories: { include: { category: true } },
				},
			});

			// Обнуляем категорию у товаров, если категория больше не разрешена
			if (removedCategoryIds.length > 0) {
				await prisma.product.updateMany({
					where: {
						departmentId,
						categoryId: { in: removedCategoryIds },
					},
					data: {
						categoryId: null,
					},
				});
			}

			return NextResponse.json(updated);
		} catch (err) {
			console.error("Ошибка при обновлении отдела:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin", "admin"]
);

// ✅ Удаление отдела
export const DELETE = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/").pop());

		if (isNaN(departmentId)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		if (scope === "department" && user.departmentId !== departmentId) {
			return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
		}

		try {
			const dependencies = await prisma.department.findUnique({
				where: { id: departmentId },
				select: {
					orders: { select: { id: true }, take: 1 },
					users: { select: { id: true }, take: 1 },
				},
			});

			if (!dependencies) {
				return NextResponse.json({ error: "Отдел не найден" }, { status: 404 });
			}

			if (dependencies.orders.length > 0 || dependencies.users.length > 0) {
				return NextResponse.json({ error: "Нельзя удалить отдел с привязанными заказами или пользователями" }, { status: 400 });
			}

			await prisma.department.delete({
				where: { id: departmentId },
			});

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("Ошибка при удалении отдела:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin"]
);
