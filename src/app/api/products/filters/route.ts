// src\app\api\products\filters\route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { Prisma } from "@prisma/client";

export const GET = withPermission(
	async (req: NextRequest, { user }) => {
		try {
			const { searchParams } = new URL(req.url);
			const brand = searchParams.get("brand") || undefined;
			const categoryId = searchParams.get("categoryId") || undefined;
			const search = searchParams.get("search")?.toLowerCase();
			const onlyStale = searchParams.get("onlyStale") === "true";
			const departmentIdParam = searchParams.get("departmentId");
			const withoutDepartment = searchParams.get("withoutDepartment") === "true";

			let departmentId = user.role === "superadmin" ? (withoutDepartment ? null : departmentIdParam ? parseInt(departmentIdParam) : undefined) : user.departmentId;

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
			};

			if (departmentId === null) {
				baseWhere.departmentId = { equals: null } as any;
			} else if (typeof departmentId === "number") {
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
			const categoryWhere = { ...baseWhere };
			delete categoryWhere.categoryId;

			const categoryCounts = await prisma.product.groupBy({
				by: ["categoryId"],
				where: categoryWhere,
				_count: true,
			});
			const categoryCountMap = new Map<number | null, number>();
			categoryCounts.forEach(({ categoryId, _count }) => {
				categoryCountMap.set(categoryId, _count);
			});

			// Отделы — важно: НЕ передаём никакой departmentId или null
			const departmentWhere: Prisma.ProductWhereInput = {
				...(brand && { brand }),
				...(categoryId && { categoryId: parseInt(categoryId) }),
				...(search && { OR: searchFilter }),
				...(onlyStale && {
					updatedAt: {
						lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
					},
				}),
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
			});

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
			const brands = brandsRaw.map((b) => b.brand).filter(Boolean);

			return NextResponse.json({
				categories: categories.map((cat) => ({
					id: cat.id,
					title: cat.title,
					productCount: categoryCountMap.get(cat.id) || 0,
				})),
				brands,
				departments,
			});
		} catch (error) {
			console.error("Ошибка получения фильтров:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"view_products",
	["superadmin", "admin", "manager"]
);
