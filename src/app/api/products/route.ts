// src/app/api/products/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withPermission } from "@/middleware/permissionMiddleware";

// Внутренний тип продукта, получаемый из Prisma с включённой категорией
type ProductWithCategory = Prisma.ProductGetPayload<{
	include: { category: true };
}>;

// Тип данных, который будет возвращаться клиенту
type ProductResponse = {
	id: number;
	sku: string;
	title: string;
	description: string | null;
	price: number;
	brand: string;
	image: string | null;
	createdAt: Date;
	updatedAt: string; // Преобразуем в строку (ISO)
	categoryId: number | null;
	departmentId: number | null;
	categoryTitle: string;
};

// 🔐 GET — доступен для admin/superadmin/manager
export const GET = withPermission(
	async (req, { user, scope }) => {
		const { searchParams } = new URL(req.url);

		const sortBy = searchParams.get("sortBy") || "createdAt";
		const order = searchParams.get("order") === "asc" ? "asc" : "desc";
		const onlyStale = searchParams.get("onlyStale") === "true";

		const cursor = searchParams.get("cursor");
		const limit = parseInt(searchParams.get("limit") || "10");
		const brand = searchParams.get("brand") || undefined;
		const categoryId = searchParams.get("categoryId") || undefined;
		const search = searchParams.get("search")?.toLowerCase();

		const searchFilter: Prisma.ProductWhereInput[] = search ? [{ title: { contains: search } }, { sku: { contains: search } }, { brand: { contains: search } }] : [];

		const where: Prisma.ProductWhereInput = {
			...(brand && { brand }),
			...(categoryId && { categoryId: parseInt(categoryId) }),
			...(search && { OR: searchFilter }),
			...(onlyStale && {
				updatedAt: {
					lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
				},
			}),
			// Ограничение по отделу (если это админ с department scope)
			...(scope === "department" && user.departmentId ? { departmentId: user.departmentId } : {}),
		};

		const orderBy: Prisma.ProductOrderByWithRelationInput = sortBy === "categoryTitle" ? { category: { title: order } } : { [sortBy]: order };

		try {
			const queryOptions: Parameters<typeof prisma.product.findMany>[0] = {
				where,
				take: limit,
				orderBy,
				include: { category: true },
			};

			if (cursor) {
				queryOptions.cursor = { id: parseInt(cursor) };
				queryOptions.skip = 1;
			}

			// Получаем данные из базы; тип – ProductWithCategory[]
			const products = await prisma.product.findMany({
				...queryOptions,
				include: { category: true },
			});

			// Преобразуем их в тип, удобный для клиента (ProductResponse)
			const mappedProducts: ProductResponse[] = products.map((p) => ({
				id: p.id,
				sku: p.sku,
				title: p.title,
				description: p.description,
				price: p.price,
				brand: p.brand,
				image: p.image,
				createdAt: p.createdAt,
				updatedAt: p.updatedAt.toISOString(),
				categoryId: p.categoryId,
				departmentId: p.departmentId,
				categoryTitle: p.category?.title || "—",
			}));

			const nextCursor = products.length === limit ? products[products.length - 1].id : null;

			// Явно указываем ожидаемый тип ответа в NextResponse.json
			return NextResponse.json<{
				products: ProductResponse[];
				nextCursor: number | null;
				limit: number;
			}>({
				products: mappedProducts,
				nextCursor,
				limit,
			});
		} catch (error) {
			console.error("Ошибка получения товаров:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"edit_products",
	["superadmin", "admin", "manager"]
); // Доступ для чтения

// 👇 POST — создание товара (только для админов и суперадминов)
export const POST = withPermission(
	async (req, { user }) => {
		const body = await req.json();

		if (
			typeof body.title !== "string" ||
			body.title.trim() === "" ||
			typeof body.sku !== "string" ||
			body.sku.trim() === "" ||
			typeof body.brand !== "string" ||
			body.brand.trim() === "" ||
			typeof body.price !== "number" ||
			isNaN(body.price)
		) {
			return NextResponse.json({ error: "Обязательные поля: title, sku, brand, price" }, { status: 400 });
		}

		try {
			const product = await prisma.product.create({
				data: {
					title: body.title,
					description: body.description,
					sku: body.sku,
					price: body.price,
					brand: body.brand,
					categoryId: body.categoryId,
					image: body.image,
					departmentId: user.departmentId ?? null,
				},
			});
			return NextResponse.json({ product });
		} catch (error) {
			console.error("Ошибка создания продукта:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["superadmin", "admin"]
);
