import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

export const POST = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			const { ids } = await req.json();

			if (!Array.isArray(ids) || ids.length === 0) {
				return NextResponse.json({ error: "Нет ID для удаления" }, { status: 400 });
			}

			const numericIds = ids.map((id) => parseInt(id)).filter((id) => !isNaN(id));

			if (numericIds.length === 0) {
				return NextResponse.json({ error: "Некорректные ID" }, { status: 400 });
			}

			// Проверка доступа к каждому товару (если admin, не может удалять чужие)
			if (scope === "department") {
				const departmentProducts = await prisma.product.findMany({
					where: {
						id: { in: numericIds },
						departmentId: { not: user.departmentId },
					},
					select: { id: true },
				});

				if (departmentProducts.length > 0) {
					return NextResponse.json({ error: "Некоторые товары не принадлежат вашему отделу" }, { status: 403 });
				}
			}

			// Удаление зависимостей
			await prisma.productFilterValue.deleteMany({
				where: { productId: { in: numericIds } },
			});

			await prisma.productAnalog.deleteMany({
				where: {
					OR: [{ productId: { in: numericIds } }, { analogId: { in: numericIds } }],
				},
			});

			await prisma.serviceKitItem.deleteMany({
				where: {
					OR: [{ productId: { in: numericIds } }, { analogProductId: { in: numericIds } }],
				},
			});

			await prisma.product.deleteMany({
				where: { id: { in: numericIds } },
			});

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("❌ Ошибка при массовом удалении:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);
