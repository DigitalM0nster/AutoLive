import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

const CHUNK_SIZE = 500;

async function chunkedDeleteMany<T>(array: number[], action: (chunk: number[]) => Promise<T>) {
	for (let i = 0; i < array.length; i += CHUNK_SIZE) {
		const chunk = array.slice(i, i + CHUNK_SIZE);
		await action(chunk);
	}
}

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

			// Удаление зависимостей — с разбиением на чанки
			await chunkedDeleteMany(numericIds, (chunk) => prisma.productFilterValue.deleteMany({ where: { productId: { in: chunk } } }));

			await chunkedDeleteMany(numericIds, (chunk) =>
				prisma.productAnalog.deleteMany({
					where: {
						OR: [{ productId: { in: chunk } }, { analogId: { in: chunk } }],
					},
				})
			);

			await chunkedDeleteMany(numericIds, (chunk) =>
				prisma.serviceKitItem.deleteMany({
					where: {
						OR: [{ productId: { in: chunk } }, { analogProductId: { in: chunk } }],
					},
				})
			);

			await chunkedDeleteMany(numericIds, (chunk) => prisma.product.deleteMany({ where: { id: { in: chunk } } }));

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("❌ Ошибка при массовом удалении:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);
