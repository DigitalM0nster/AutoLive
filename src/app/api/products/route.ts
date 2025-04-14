// src\app\api\products\route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withPermission } from "@/middleware/permissionMiddleware";

type ProductWithRelations = {
	id: number;
	title: string;
	sku: string;
	brand: string;
	price: number;
	description: string | null;
	image: string | null;
	createdAt: Date;
	updatedAt: Date;
	categoryId: number | null;
	departmentId: number | null;
	category: {
		id: number;
		title: string;
		image: string | null;
		createdAt: Date;
		order: number;
	} | null;
	department: {
		id: number;
		name: string;
		createdAt: Date;
	} | null;
};

type ProductResponse = {
	id: number;
	sku: string;
	title: string;
	description: string | null;
	price: number;
	brand: string;
	image: string | null;
	createdAt: Date;
	updatedAt: string;
	categoryId: number | null;
	departmentId: number | null;
	categoryTitle: string;
	department?: {
		id: number;
		name: string;
	};
};

interface ExtendedRequestContext {
	user: {
		role: "superadmin" | "admin" | "manager";
		departmentId: number | null;
	};
	scope: string;
}

export const GET = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		const { searchParams } = new URL(req.url);

		const sortBy = searchParams.get("sortBy") || "createdAt";
		const order = searchParams.get("order") === "asc" ? "asc" : "desc";
		const onlyStale = searchParams.get("onlyStale") === "true";

		const cursor = searchParams.get("cursor");
		const limit = parseInt(searchParams.get("limit") || "10");
		const brand = searchParams.get("brand") || undefined;
		const categoryId = searchParams.get("categoryId") || undefined;
		const departmentId = searchParams.get("departmentId");
		console.log("Принято departmentId:", departmentId);

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
		};

		// 📌 ЯВНО ДОБАВЛЯЕМ departmentId
		if (user?.role === "superadmin") {
			if (departmentId !== null && departmentId !== "") {
				where.departmentId = parseInt(departmentId);
			}
		} else if (user?.departmentId) {
			where.departmentId = user.departmentId;
		}

		const orderBy: Prisma.ProductOrderByWithRelationInput = sortBy === "categoryTitle" ? { category: { title: order } } : { [sortBy]: order };

		try {
			const queryOptions: Parameters<typeof prisma.product.findMany>[0] = {
				where,
				take: limit,
				orderBy,
				include: {
					category: true,
					department: true,
				},
				...(cursor && {
					cursor: { id: parseInt(cursor) },
					skip: 1,
				}),
			};

			const products = (await prisma.product.findMany(queryOptions)) as ProductWithRelations[];

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
				department: p.department ? { id: p.department.id, name: p.department.name } : undefined,
			}));

			const nextCursor = products.length === limit ? products[products.length - 1].id : null;

			return NextResponse.json({
				products: mappedProducts,
				nextCursor,
				limit,
			});
		} catch (error) {
			console.error("Ошибка получения товаров:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"view_products", // или другой скоуп, если используешь
	["superadmin", "admin", "manager"]
);

export const POST = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			const data = await req.json();

			// Только superadmin может указать departmentId вручную
			const departmentId = user.role === "superadmin" ? data.departmentId ?? null : user.departmentId ?? null;

			if (!departmentId) {
				return new NextResponse("Отдел не определён", { status: 400 });
			}

			const newProduct = await prisma.product.create({
				data: {
					title: data.title,
					sku: data.sku,
					price: data.price,
					brand: data.brand,
					description: data.description,
					image: data.image,
					categoryId: data.categoryId,
					departmentId,
				},
				include: {
					department: true,
				},
			});

			return NextResponse.json({ product: newProduct });
		} catch (error) {
			console.error("Ошибка при создании товара:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"edit_products",
	["superadmin", "admin"]
);
