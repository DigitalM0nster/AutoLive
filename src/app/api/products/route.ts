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
import { ProductListItem, ProductWithRelationsFromDB, User, ProductCreateRequest, FilterRequest } from "@/lib/types";

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
		const supplierPriceMin = parseFloat(searchParams.get("supplierPriceMin") || "0");
		const supplierPriceMax = parseFloat(searchParams.get("supplierPriceMax") || "10000000");

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

		// Собираем все условия в массив AND
		const andConditions: Prisma.ProductWhereInput[] = [];

		// Добавляем базовые условия
		if (brand) andConditions.push({ brand });
		if (categoryId) andConditions.push({ categoryId: parseInt(categoryId) });
		if (search) andConditions.push({ OR: searchFilter });
		if (onlyStale) {
			andConditions.push({
				updatedAt: {
					lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
				},
			});
		}

		// Добавляем фильтр по цене
		andConditions.push({
			price: {
				gte: priceMin,
				lte: priceMax,
			},
		});

		// Добавляем фильтр по цене поставщика: учитываем null значения
		andConditions.push({
			OR: [
				{
					supplierPrice: {
						gte: supplierPriceMin,
						lte: supplierPriceMax,
					},
				},
				{
					supplierPrice: null,
				},
			],
		});

		const where: Prisma.ProductWhereInput = {
			AND: andConditions,
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
				category: p.category ? { id: p.category.id, title: p.category.title } : undefined,
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

			// Валидация цены поставщика
			if (supplierPrice !== null && finalPrice !== null && supplierPrice > finalPrice) {
				return new NextResponse("Цена поставщика не может быть больше цены на сайте", { status: 400 });
			}

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

			// Проверяем разрешенные категории для отдела
			const allowedCategories = await prisma.departmentCategory.findMany({
				where: {
					departmentId,
				},
				select: {
					categoryId: true,
				},
			});

			const allowedCategoryIds = allowedCategories.map((ac) => ac.categoryId);

			let categoryIdToUse = data.categoryId;
			if (categoryIdToUse) {
				if (allowedCategoryIds.length === 0) {
					// Если для отдела нет разрешенных категорий, не позволяем устанавливать категорию
					return new NextResponse("Для данного отдела не настроены разрешенные категории. Создание товара с категорией невозможно.", { status: 400 });
				} else if (!allowedCategoryIds.includes(categoryIdToUse)) {
					// Если категория не разрешена для отдела
					return new NextResponse(`Категория не разрешена для выбранного отдела. Разрешенные категории: ${allowedCategoryIds.join(", ")}`, { status: 400 });
				}
			}

			// Создаем товар
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

			// Добавляем фильтры если они есть
			if (data.filterValues && Array.isArray(data.filterValues)) {
				const filterValueRecords = data.filterValues.flatMap((filter: FilterRequest) =>
					filter.valueIds.map((valueId: number) => ({
						productId: newProduct.id,
						filterValueId: valueId,
					}))
				);

				if (filterValueRecords.length > 0) {
					await prisma.productFilterValue.createMany({
						data: filterValueRecords,
					});
				}
			}

			// Получаем полные данные товара с фильтрами и категориями для логирования
			const fullProductData = await prisma.product.findUnique({
				where: { id: newProduct.id },
				include: {
					department: { select: { id: true, name: true } },
					category: { select: { id: true, title: true } },
					productFilterValues: {
						include: {
							filterValue: {
								include: {
									filter: { select: { id: true, title: true } },
								},
							},
						},
					},
				},
			});

			await logProductChange({
				entityId: newProduct.id,
				adminId: user.id,
				message: "Ручное создание товара пользователем из админки.",
				afterData: fullProductData,
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
