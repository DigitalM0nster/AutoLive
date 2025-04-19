// src/app/api/products/bulk-delete/route.ts

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

			// Проверка доступа к каждому товару
			if (scope === "department") {
				const forbidden = await prisma.product.findMany({
					where: {
						id: { in: numericIds },
						departmentId: { not: user.departmentId },
					},
					select: { id: true },
				});

				if (forbidden.length > 0) {
					return NextResponse.json({ error: "Некоторые товары не принадлежат вашему отделу" }, { status: 403 });
				}
			}

			const productsToDelete = await prisma.product.findMany({
				where: { id: { in: numericIds } },
				include: {
					department: true,
					category: true,
				},
			});

			// логируем заранее
			await prisma.productLog.createMany({
				data: productsToDelete.map((product) => ({
					action: "bulk",
					userId: user.id,
					departmentId: product.departmentId,
					productId: product.id,
					message: null, // не отображаем как отдельное ручное удаление
					snapshotBefore: product,
				})),
			});

			// обнуляем ссылки на удаляемые продукты
			await chunkedDeleteMany(numericIds, (chunk) =>
				prisma.productLog.updateMany({
					where: { productId: { in: chunk } },
					data: { productId: null },
				})
			);

			// удаляем связи фильтров
			await chunkedDeleteMany(numericIds, (chunk) =>
				prisma.productFilterValue.deleteMany({
					where: { productId: { in: chunk } },
				})
			);

			// чистим "висячие" значения фильтров
			await prisma.filterValue.deleteMany({
				where: {
					productFilterValues: {
						none: {},
					},
				},
			});

			// удаляем связи аналогов
			await chunkedDeleteMany(numericIds, (chunk) =>
				prisma.productAnalog.deleteMany({
					where: {
						OR: [{ productId: { in: chunk } }, { analogId: { in: chunk } }],
					},
				})
			);

			// удаляем связи комплектов
			await chunkedDeleteMany(numericIds, (chunk) =>
				prisma.serviceKitItem.deleteMany({
					where: {
						OR: [{ productId: { in: chunk } }, { analogProductId: { in: chunk } }],
					},
				})
			);

			// удаляем сами товары
			await chunkedDeleteMany(numericIds, (chunk) =>
				prisma.product.deleteMany({
					where: { id: { in: chunk } },
				})
			);

			// логируем массовое удаление
			// группировка по отделам
			const byDepartment = new Map<number | null, number>();

			for (const product of productsToDelete) {
				const deptId = product.departmentId ?? null;
				byDepartment.set(deptId, (byDepartment.get(deptId) ?? 0) + 1);
			}

			// читаем названия отделов
			const departments = await prisma.department.findMany({
				where: {
					id: { in: [...byDepartment.keys()].filter((id): id is number => id !== null) },
				},
				select: { id: true, name: true },
			});

			const departmentMap = new Map<number, string>();
			departments.forEach((d) => departmentMap.set(d.id, d.name));

			const detailsPerDept = [...byDepartment.entries()]
				.map(([deptId, count]) => {
					if (deptId === null) return `без отдела — ${count} шт.`;
					const name = departmentMap.get(deptId) || `ID ${deptId}`;
					return `${name} — ${count} шт.`;
				})
				.join(", ");

			await prisma.bulkActionLog.create({
				data: {
					userId: user.id,
					departmentId: user.departmentId ?? null,
					action: "delete_products",
					message: `Удалено ${productsToDelete.length} товаров: ${detailsPerDept}`,
					count: productsToDelete.length,
					snapshots: productsToDelete.map((p) => ({
						id: p.id,
						title: p.title,
						sku: p.sku,
						brand: p.brand,
						price: p.price,
						supplierPrice: p.supplierPrice,
						department: p.department ? { name: p.department.name } : undefined,
						category: p.category ? { title: p.category.title } : undefined,
					})),
				},
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
