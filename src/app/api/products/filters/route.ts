import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import type { Prisma } from "@prisma/client";

export const GET = withPermission(
	async (req: NextRequest, { user }) => {
		try {
			const { searchParams } = new URL(req.url);
			const brand = searchParams.get("brand") || undefined;
			const categoryId = searchParams.get("categoryId") || undefined;
			const search = searchParams.get("search")?.toLowerCase();
			const onlyStale = searchParams.get("onlyStale") === "true";
			const departmentIdParam = searchParams.get("departmentId");
			const priceMin = parseFloat(searchParams.get("priceMin") || "0");
			const priceMax = parseFloat(searchParams.get("priceMax") || "1000000");

			let departmentId = user.role === "superadmin" ? (departmentIdParam ? parseInt(departmentIdParam) : undefined) : user.departmentId;

			const searchFilter: Prisma.ProductWhereInput[] = search ? [{ title: { contains: search } }, { sku: { contains: search } }, { brand: { contains: search } }] : [];

			const baseWhere: Prisma.ProductWhereInput = {
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

			if (typeof departmentId === "number") {
				baseWhere.departmentId = departmentId;
			}

			// Разрешённые категории
			let allowedCategoryIds: number[] | null = null;
			if (typeof departmentId === "number") {
				const allowed = await prisma.departmentCategory.findMany({
					where: { departmentId },
					select: { categoryId: true },
				});
				allowedCategoryIds = allowed.map((a) => a.categoryId);
			}

			// === СЧЁТЧИКИ ===

			// Категории
			const categoryWhere: Prisma.ProductWhereInput = {
				...(search && { OR: searchFilter }),
				...(brand && { brand }),
				...(onlyStale && {
					updatedAt: {
						lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
					},
				}),
				price: {
					gte: priceMin,
					lte: priceMax,
				},
				...(typeof departmentId === "number" ? { departmentId } : {}),
			};

			const categoryCounts = await prisma.product.groupBy({
				by: ["categoryId"],
				where: categoryWhere,
				_count: true,
			});
			const categoryCountMap = new Map<number | null, number>();
			categoryCounts.forEach(({ categoryId, _count }) => {
				categoryCountMap.set(categoryId, _count);
			});
			const categoryCountsObject = Object.fromEntries(categoryCountMap.entries());

			// Отделы — без учёта фильтра по departmentId
			const departmentWhere: Prisma.ProductWhereInput = {
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

			const departmentCounts = await prisma.product.groupBy({
				by: ["departmentId"],
				where: departmentWhere,
				_count: true,
			});
			const departmentCountMap = new Map<number | null, number>();
			departmentCounts.forEach(({ departmentId, _count }) => {
				departmentCountMap.set(departmentId, _count);
			});

			// Категории
			const categories = await prisma.category.findMany({
				where: allowedCategoryIds ? { id: { in: allowedCategoryIds } } : {},
				orderBy: { order: "asc" },
				include: user.role === "superadmin" ? { allowedDepartments: { select: { departmentId: true } } } : undefined,
			});

			const categoryNoneCount = categoryCountMap.get(null) || 0;

			// Отделы
			const rawDepartments =
				user.role === "superadmin" ? await prisma.department.findMany() : user.departmentId ? await prisma.department.findMany({ where: { id: user.departmentId } }) : [];

			const departments = rawDepartments.map((d) => ({
				id: d.id,
				name: d.name,
				productCount: departmentCountMap.get(d.id) || 0,
			}));

			// Бренды
			const brandWhere = { ...baseWhere };
			delete brandWhere.brand;

			const brandsRaw = await prisma.product.findMany({
				where: brandWhere,
				select: { brand: true },
				distinct: ["brand"],
			});

			const normalizedBrandsMap = new Map<string, string>();
			brandsRaw.forEach(({ brand }) => {
				if (!brand) return;
				const normalized = brand.trim().toLowerCase();
				if (!normalizedBrandsMap.has(normalized)) {
					normalizedBrandsMap.set(normalized, brand);
				}
			});
			const brands = Array.from(normalizedBrandsMap.values()).sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base" }));

			return NextResponse.json({
				categories: categories.map((cat) => ({
					id: cat.id,
					title: cat.title,
					productCount: categoryCountMap.get(cat.id) || 0,
					...(user.role === "superadmin" && {
						allowedDepartments: (cat as any).allowedDepartments,
					}),
				})),
				categoryNoneCount,
				categoryCounts: categoryCountsObject,
				brands,
				departments,
				departmentCounts: Object.fromEntries(departmentCountMap.entries()), // ✅ ЭТО ДОБАВЬ
			});
		} catch (error) {
			console.error("Ошибка получения фильтров:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"view_products",
	["superadmin", "admin", "manager"]
);
