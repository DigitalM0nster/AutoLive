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
			const categoryIdsParam = searchParams.get("categoryIds");

			if (!categoryIdsParam) {
				return NextResponse.json({ existingCategoryIds: [] });
			}

			const categoryIds = categoryIdsParam
				.split(",")
				.map((id) => parseInt(id))
				.filter((id) => !isNaN(id));

			if (categoryIds.length === 0) {
				return NextResponse.json({ existingCategoryIds: [] });
			}

			const existingCategories = await prisma.category.findMany({
				where: { id: { in: categoryIds } },
				select: { id: true },
			});

			const existingCategoryIds = existingCategories.map((c) => c.id);

			return NextResponse.json({
				existingCategoryIds,
			});
		} catch (error) {
			console.error("Ошибка при проверке существования категорий:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_categories",
	["superadmin", "admin", "manager"]
);
