import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

interface ExtendedRequestContext {
	user: any;
	scope: string;
}

export const GET = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			const { searchParams } = new URL(req.url);
			const productIdsParam = searchParams.get("productIds");

			if (!productIdsParam) {
				return NextResponse.json({ existingProducts: {} });
			}

			const numericProductIds = productIdsParam
				.split(",")
				.map((id) => parseInt(id))
				.filter((id) => !isNaN(id));

			if (numericProductIds.length === 0) {
				return NextResponse.json({ existingProducts: {} });
			}

			// Получаем существующие товары
			const existingProducts = await prisma.product.findMany({
				where: {
					id: { in: numericProductIds },
				},
				select: {
					id: true,
					title: true,
					sku: true,
					brand: true,
					price: true,
					description: true,
					category: {
						select: {
							id: true,
							title: true,
						},
					},
					department: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			});

			// Преобразуем в объект с ID как ключом
			const productsMap = existingProducts.reduce((acc, product) => {
				acc[product.id] = product;
				return acc;
			}, {} as Record<number, any>);

			return NextResponse.json({ existingProducts: productsMap });
		} catch (error) {
			console.error("Ошибка при проверке существования товаров:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_products",
	["admin", "superadmin"]
);
