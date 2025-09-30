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
		let numericIds: number[] = [];

		try {
			const { ids } = await req.json();

			if (!Array.isArray(ids) || ids.length === 0) {
				return NextResponse.json({ error: "Нет ID для удаления" }, { status: 400 });
			}

			numericIds = ids.map((id) => parseInt(id)).filter((id) => !isNaN(id));
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

			// Получаем данные пользователя для снапшота
			const userData = await prisma.user.findUnique({
				where: { id: user.id },
				select: {
					id: true,
					first_name: true,
					last_name: true,
					middle_name: true,
					phone: true,
					role: true,
					department: {
						select: { id: true, name: true },
					},
				},
			});

			if (!userData) {
				return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
			}

			// Если удаляется только один товар, создаем обычный лог удаления
			if (numericIds.length === 1) {
				const singleProduct = productsToDelete[0];

				// Создаем обычный лог удаления
				await prisma.product_log.create({
					data: {
						action: "delete",
						message: `Товар "${singleProduct.title}" удален`,
						userId: user.id,
						productId: singleProduct.id,
						userSnapshot: userData,
						departmentSnapshot: userData.department || undefined,
						snapshotBefore: JSON.stringify({
							id: singleProduct.id,
							title: singleProduct.title,
							sku: singleProduct.sku,
							brand: singleProduct.brand,
							price: singleProduct.price,
							supplierPrice: singleProduct.supplierPrice,
							description: singleProduct.description,
							department: singleProduct.department
								? {
										id: singleProduct.department.id,
										name: singleProduct.department.name,
								  }
								: undefined,
							category: singleProduct.category
								? {
										id: singleProduct.category.id,
										title: singleProduct.category.title,
								  }
								: undefined,
						}),
						snapshotAfter: null,
					},
				});

				// Удаляем связи и сам товар
				await prisma.productFilterValue.deleteMany({
					where: { productId: singleProduct.id },
				});

				await prisma.productAnalog.deleteMany({
					where: {
						OR: [{ productId: singleProduct.id }, { analogId: singleProduct.id }],
					},
				});

				await prisma.serviceKitItem.deleteMany({
					where: {
						OR: [{ product_id: singleProduct.id }, { analog_product_id: singleProduct.id }],
					},
				});

				await prisma.product.delete({
					where: { id: singleProduct.id },
				});
			} else {
				// Для массового удаления создаем лог в bulk_action_log

				// обнуляем ссылки на удаляемые продукты
				await chunkedDeleteMany(numericIds, (chunk) =>
					prisma.product_log.updateMany({
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
							OR: [{ product_id: { in: chunk } }, { analog_product_id: { in: chunk } }],
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
				// собираем все уникальные отделы из удаленных товаров
				const departmentsMap = new Map<number, { id: number; name: string }>();
				productsToDelete.forEach((product) => {
					if (product.department) {
						departmentsMap.set(product.department.id, {
							id: product.department.id,
							name: product.department.name,
						});
					}
				});

				const departmentsSnapshot = Array.from(departmentsMap.values());

				// группировка по отделам для сообщения
				const byDepartment = new Map<number | null, number>();
				for (const product of productsToDelete) {
					const deptId = product.departmentId ?? null;
					byDepartment.set(deptId, (byDepartment.get(deptId) ?? 0) + 1);
				}

				const detailsPerDept = [...byDepartment.entries()]
					.map(([deptId, count]) => {
						if (deptId === null) return `без отдела — ${count} шт.`;
						const dept = departmentsSnapshot.find((d) => d.id === deptId);
						const name = dept ? dept.name : `ID ${deptId}`;
						return `${name} — ${count} шт.`;
					})
					.join(", ");

				await prisma.bulk_action_log.create({
					data: {
						action: "delete",
						message: `Удалено ${productsToDelete.length} товаров: ${detailsPerDept}`,
						count: productsToDelete.length,
						user_snapshot: userData,
						departments_snapshot: departmentsSnapshot,
						products_snapshot: productsToDelete.map((p) => ({
							id: p.id,
							title: p.title,
							sku: p.sku,
							brand: p.brand,
							price: p.price,
							supplierPrice: p.supplierPrice,
							department: p.department ? { id: p.department.id, name: p.department.name } : undefined,
							category: p.category ? { title: p.category.title } : undefined,
						})),
						// Временные поля для совместимости
						user_id: user.id,
						department_id: user.departmentId ?? null,
						snapshots: JSON.stringify(
							productsToDelete.map((p) => ({
								id: p.id,
								title: p.title,
								sku: p.sku,
								brand: p.brand,
								price: p.price,
								supplierPrice: p.supplierPrice,
								department: p.department ? { id: p.department.id, name: p.department.name } : undefined,
								category: p.category ? { title: p.category.title } : undefined,
							}))
						),
					},
				});
			}

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("❌ Ошибка при массовом удалении:", error);
			console.error("❌ Детали ошибки:", {
				message: error instanceof Error ? error.message : "Неизвестная ошибка",
				stack: error instanceof Error ? error.stack : undefined,
				ids: numericIds?.slice(0, 10), // Показываем первые 10 ID для отладки
			});
			return NextResponse.json(
				{
					error: "Ошибка сервера",
					details: error instanceof Error ? error.message : "Неизвестная ошибка",
				},
				{ status: 500 }
			);
		}
	},
	"edit_products",
	["admin", "superadmin"]
);
