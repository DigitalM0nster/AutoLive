interface ExtendedRequestContext {
	user: Pick<User, "id" | "role"> & { departmentId: number | null };
	scope: string;
}

// src\app\api\products\route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withPermission } from "@/middleware/permissionMiddleware";
import { logProductChange } from "@/lib/universalLogging";
import { ProductListItem, ProductWithRelationsFromDB, User } from "@/lib/types";

interface ExtendedRequestContext {
	user: Pick<User, "id" | "role"> & { departmentId: number | null };
	scope: string;
}

export const GET = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		const { searchParams } = new URL(req.url);

		const sortBy = searchParams.get("sortBy") || "id";
		const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
		const onlyStale = searchParams.get("onlyStale") === "true";

		const cursor = searchParams.get("cursor");
		const limit = parseInt(searchParams.get("limit") || "10");
		const pageParam = parseInt(searchParams.get("page") || "1", 10);
		const skipOffset = (pageParam - 1) * limit;

		const brand = searchParams.get("brand") || undefined;
		const categoryId = searchParams.get("categoryId") || undefined;
		const departmentId = searchParams.get("departmentId");
		const search = searchParams.get("search");

		const priceMin = parseFloat(searchParams.get("priceMin") || "0");
		const priceMax = parseFloat(searchParams.get("priceMax") || "10000000");

		// Создаем фильтр поиска с учетом регистра
		const searchFilter: Prisma.ProductWhereInput[] = search
			? [
					{ title: { contains: search, mode: "insensitive" } },
					{ sku: { contains: search, mode: "insensitive" } },
					{ brand: { contains: search, mode: "insensitive" } },
					// Добавляем поиск по ID, если поисковый запрос является числом
					...(isNaN(Number(search)) ? [] : [{ id: Number(search) }]),
			  ]
			: [];

		const where: Prisma.ProductWhereInput = {
			...(brand && { brand }),
			...(categoryId && { categoryId: parseInt(categoryId) }),
			...(search && { OR: searchFilter }),
			...(onlyStale && {
				updatedAt: {
					lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
				},
			}),
			price: {
				gte: priceMin,
				lte: priceMax,
			},
		};

		if (user?.role === "superadmin") {
			if (departmentId !== null && departmentId !== "") {
				where.departmentId = parseInt(departmentId);
			}
		} else {
			where.departmentId = user.departmentId ?? -1;
		}

		let orderBy: Prisma.ProductOrderByWithRelationInput;

		if (sortBy === "categoryTitle") {
			orderBy = { category: { title: sortOrder } };
		} else if (sortBy === "departmentTitle") {
			orderBy = { department: { name: sortOrder } };
		} else {
			orderBy = { [sortBy]: sortOrder };
		}

		try {
			const queryOptions: Parameters<typeof prisma.product.findMany>[0] = {
				where,
				take: limit,
				orderBy,
				include: {
					category: true,
					department: true,
				},
				...(cursor
					? {
							cursor: { id: parseInt(cursor, 10) },
							skip: 1,
					  }
					: {
							skip: skipOffset,
					  }),
			};

			const total = await prisma.product.count({ where });

			const products = (await prisma.product.findMany(queryOptions)) as ProductWithRelationsFromDB[];

			const mappedProducts: ProductListItem[] = products.map((p) => ({
				id: p.id,
				sku: p.sku,
				brand: p.brand,
				title: p.title,
				description: p.description,
				price: p.price,
				image: p.image,
				createdAt: p.createdAt.toISOString(),
				updatedAt: p.updatedAt.toISOString(),
				departmentId: p.departmentId,
				categoryId: p.categoryId,
				categoryTitle: p.category?.title || "—",
				department: p.department ? { id: p.department.id, name: p.department.name } : undefined,
				...(user.role !== "superadmin" && user.role !== "admin" && user.role !== "manager" ? {} : { supplierPrice: p.supplierPrice ?? null }),
			}));

			const nextCursor = products.length === limit ? products[products.length - 1].id : null;

			return NextResponse.json({
				products: mappedProducts,
				nextCursor,
				limit,
				total,
			});
		} catch (error) {
			console.error("Ошибка получения товаров:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"view_products",
	["superadmin", "admin", "manager"]
);

export const POST = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			const data = await req.json();

			const departmentId = user.role === "superadmin" ? data.departmentId ?? null : user.departmentId ?? null;

			if (user.role === "admin" && !departmentId) {
				return new NextResponse("Администратор должен иметь отдел", { status: 400 });
			}

			const rawSku = String(data.sku).trim();
			const rawBrand = String(data.brand).trim();
			const normalizedSku = rawSku.toLowerCase();
			const normalizedBrand = rawBrand.toLowerCase();

			const existing = await prisma.product.findFirst({
				where: {
					sku: normalizedSku,
					brand: normalizedBrand,
					departmentId: departmentId ?? null,
				},
			});

			if (existing) {
				return new NextResponse("Товар с таким артикулом и брендом уже существует", { status: 409 });
			}

			let supplierPrice = data.supplierPrice !== "" ? parseFloat(data.supplierPrice) : null;
			let finalPrice = data.price !== "" ? parseFloat(data.price) : null;

			if (!finalPrice && supplierPrice) {
				const markupRule = await prisma.markupRule.findFirst({
					where: {
						departmentId,
						priceFrom: { lte: supplierPrice },
						OR: [{ priceTo: null }, { priceTo: { gte: supplierPrice } }],
						...(data.brand && { brand: normalizedBrand }),
						...(data.categoryId && { categoryId: data.categoryId }),
					},
					orderBy: { priceFrom: "desc" },
				});

				if (markupRule) {
					finalPrice = supplierPrice * markupRule.markup;
				}
			}

			let categoryIdToUse = data.categoryId;
			if (categoryIdToUse) {
				const allowed = await prisma.departmentCategory.findFirst({
					where: {
						departmentId,
						categoryId: categoryIdToUse,
					},
				});
				if (!allowed) {
					console.warn(`Категория ${categoryIdToUse} запрещена для отдела ${departmentId}, убираем`);
					categoryIdToUse = null;
				}
			}

			const newProduct = await prisma.product.create({
				data: {
					title: String(data.title).trim(),
					sku: rawSku,
					price: finalPrice ?? 0,
					supplierPrice,
					brand: rawBrand,
					description: data.description?.trim() || null,
					image: data.image?.trim() || null,
					categoryId: categoryIdToUse,
					departmentId,
				},
			});

			await logProductChange({
				entityId: newProduct.id,
				adminId: user.id,
				message: "Ручное создание товара пользователем из админки.",
				afterData: newProduct,
			});

			return NextResponse.json({ product: newProduct });
		} catch (error: any) {
			if (error.code === "P2002") {
				return new NextResponse("Товар с таким артикулом и брендом уже существует (уникальность)", { status: 409 });
			}
			console.error("Ошибка при создании товара:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"edit_products",
	["superadmin", "admin"]
);
