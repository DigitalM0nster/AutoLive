import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

export const GET = withPermission(
	async (req: NextRequest, { user }) => {
		try {
			const departmentId = user.role === "superadmin" ? undefined : user.departmentId;

			const products = await prisma.product.findMany({
				where: departmentId ? { departmentId } : {},
				select: {
					brand: true,
					categoryId: true,
					departmentId: true,
				},
			});

			const uniqueBrands = [...new Set(products.map((p) => p.brand).filter(Boolean))];
			const uniqueCategoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean))];
			const uniqueDepartmentIds = [...new Set(products.map((p) => p.departmentId).filter(Boolean))];

			const [categories, departments] = await Promise.all([
				prisma.category.findMany({
					where: { id: { in: uniqueCategoryIds as number[] } },
					orderBy: { order: "asc" },
				}),
				user.role === "superadmin"
					? prisma.department.findMany({ where: { id: { in: uniqueDepartmentIds as number[] } } })
					: user.departmentId
					? prisma.department.findMany({ where: { id: user.departmentId } })
					: [],
			]);

			return NextResponse.json({
				categories: categories.map((cat) => ({
					id: cat.id,
					title: cat.title,
					productCount: products.filter((p) => p.categoryId === cat.id).length,
				})),
				brands: uniqueBrands,
				departments,
			});
		} catch (error) {
			console.error("Ошибка получения категорий/отделов:", error);
			return new NextResponse("Ошибка сервера", { status: 500 });
		}
	},
	"view_products",
	["superadmin", "admin", "manager"]
);
