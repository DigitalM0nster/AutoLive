// src\app\api\departments\[departmentId]\route.ts

import { db } from "@/drizzle/db";
import { departments, departmentCategories, users, products, orders, categories } from "@/drizzle/schema";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { eq, inArray, desc, and } from "drizzle-orm";

// ✅ Получение одного отдела по ID
export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/").pop());
		if (isNaN(departmentId)) {
			return NextResponse.json({ error: "Некорректный ID отдела" }, { status: 400 });
		}
		try {
			// Получаем отдел
			const departmentArr = await db.select({ id: departments.id, name: departments.name }).from(departments).where(eq(departments.id, departmentId));
			const department = departmentArr[0];
			if (!department) {
				return NextResponse.json({ error: "Отдел не найден" }, { status: 404 });
			}
			// Получаем разрешённые категории
			const allowedCategories = await db
				.select({
					id: categories.id,
					title: categories.title,
				})
				.from(departmentCategories)
				.leftJoin(categories, eq(departmentCategories.categoryId, categories.id))
				.where(eq(departmentCategories.departmentId, departmentId));
			// Получаем пользователей отдела (только admin и manager)
			const departmentUsers = await db
				.select({
					id: users.id,
					first_name: users.firstName,
					last_name: users.lastName,
					role: users.role,
					phone: users.phone,
				})
				.from(users)
				.where(and(eq(users.departmentId, departmentId), inArray(users.role, ["admin", "manager"])));
			// Получаем продукты отдела
			const departmentProducts = await db
				.select({
					id: products.id,
					title: products.title,
					sku: products.sku,
					brand: products.brand,
					price: products.price,
				})
				.from(products)
				.where(eq(products.departmentId, departmentId));
			// Получаем заказы отдела (последние 10)
			const departmentOrders = await db
				.select({
					id: orders.id,
					title: orders.title,
					status: orders.status,
					createdAt: orders.createdAt,
				})
				.from(orders)
				.where(eq(orders.departmentId, departmentId))
				.orderBy(desc(orders.createdAt))
				.limit(10);
			// Собираем ответ
			return NextResponse.json({
				id: department.id,
				name: department.name,
				allowedCategories: allowedCategories.map((c) => ({ category: c })),
				users: departmentUsers,
				products: departmentProducts,
				orders: departmentOrders,
			});
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
			const prevAllowed = await db
				.select({ categoryId: departmentCategories.categoryId })
				.from(departmentCategories)
				.where(eq(departmentCategories.departmentId, departmentId));
			const prevCategoryIds = prevAllowed.map((c) => c.categoryId);
			const removedCategoryIds = prevCategoryIds.filter((id) => !categoryIds.includes(id));
			// Обновляем название отдела
			await db.update(departments).set({ name }).where(eq(departments.id, departmentId));
			// Удаляем все старые связи
			await db.delete(departmentCategories).where(eq(departmentCategories.departmentId, departmentId));
			// Создаём новые связи
			if (categoryIds && categoryIds.length > 0) {
				await db.insert(departmentCategories).values(categoryIds.map((id: number) => ({ departmentId, categoryId: id })));
			}
			// Обнуляем категорию у товаров, если категория больше не разрешена
			if (removedCategoryIds.length > 0) {
				await db
					.update(products)
					.set({ categoryId: null })
					.where(and(eq(products.departmentId, departmentId), inArray(products.categoryId, removedCategoryIds)));
			}
			// Возвращаем обновлённый отдел с категориями
			const allowedCategories = await db
				.select({
					id: categories.id,
					title: categories.title,
				})
				.from(departmentCategories)
				.leftJoin(categories, eq(departmentCategories.categoryId, categories.id))
				.where(eq(departmentCategories.departmentId, departmentId));
			return NextResponse.json({ id: departmentId, name, allowedCategories });
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
			// Проверяем зависимости: есть ли пользователи или заказы
			const usersCountArr = await db.select({ id: users.id }).from(users).where(eq(users.departmentId, departmentId)).limit(1);
			const ordersCountArr = await db.select({ id: orders.id }).from(orders).where(eq(orders.departmentId, departmentId)).limit(1);
			if (usersCountArr.length > 0 || ordersCountArr.length > 0) {
				return NextResponse.json({ error: "Нельзя удалить отдел с привязанными заказами или пользователями" }, { status: 400 });
			}
			// Удаляем отдел
			await db.delete(departments).where(eq(departments.id, departmentId));
			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("Ошибка при удалении отдела:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_departments",
	["superadmin"]
);
