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

				// Удаляем товар в транзакции, создавая логи ДО удаления
				await prisma.$transaction(async (tx) => {
					// Создаём лог удаления товара ДО удаления
					await tx.product_log.create({
						data: {
							action: "delete",
							message: `Товар "${singleProduct.title}" удален`,
							userSnapshot: userData,
							departmentSnapshot: singleProduct.department
								? {
										id: singleProduct.department.id,
										name: singleProduct.department.name,
								  }
								: undefined,
							productSnapshotBefore: {
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
							} as any,
							productSnapshotAfter: null,
						},
					});

					// Также логируем в общую таблицу ChangeLog для универсальности
					await tx.changeLog.create({
						data: {
							entityType: "product",
							message: `Товар "${singleProduct.title}" удален`,
							entityId: singleProduct.id,
							adminId: user.id,
							departmentId: userData.department?.id || null,
							snapshotBefore: {
								id: singleProduct.id,
								title: singleProduct.title,
								sku: singleProduct.sku,
								brand: singleProduct.brand,
								price: singleProduct.price,
								supplierPrice: singleProduct.supplierPrice,
								description: singleProduct.description,
								department: singleProduct.department,
								category: singleProduct.category,
							} as any,
							snapshotAfter: null,
							adminSnapshot: userData as any,
						},
					});

					// Удаляем связи и сам товар (логи уже созданы)
					await tx.productFilterValue.deleteMany({
						where: { productId: singleProduct.id },
					});

					await tx.productAnalog.deleteMany({
						where: {
							OR: [{ productId: singleProduct.id }, { analogId: singleProduct.id }],
						},
					});

					// Удаляем записи ServiceKitItemAnalog, которые ссылаются на товар как аналог
					await tx.serviceKitItemAnalog.deleteMany({
						where: {
							analogProductId: singleProduct.id,
						},
					});

					// Удаляем записи ServiceKitItem, которые ссылаются на товар
					await tx.serviceKitItem.deleteMany({
						where: {
							product_id: singleProduct.id,
						},
					});

					await tx.product.delete({
						where: { id: singleProduct.id },
					});
				});
			} else {
				// Для массового удаления создаем лог в bulk_action_log и ChangeLog ДО удаления

				// Собираем все уникальные отделы из удаленных товаров
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

				// Группировка по отделам для сообщения
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

				const bulkMessage = `Удалено ${productsToDelete.length} товаров: ${detailsPerDept}`;

				// Удаляем товары в транзакции, создавая логи ДО удаления
				await prisma.$transaction(async (tx) => {
					// Создаём лог массового удаления ДО удаления товаров
					await tx.bulk_action_log.create({
						data: {
							action: "delete",
							message: bulkMessage,
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
						},
					});

					// Также логируем в общую таблицу ChangeLog для каждого товара
					for (const product of productsToDelete) {
						await tx.changeLog.create({
							data: {
								entityType: "product",
								message: `Товар "${product.title}" удален (массовое удаление)`,
								entityId: product.id,
								adminId: user.id,
								departmentId: userData.department?.id || null,
								snapshotBefore: {
									id: product.id,
									title: product.title,
									sku: product.sku,
									brand: product.brand,
									price: product.price,
									supplierPrice: product.supplierPrice,
									description: product.description,
									department: product.department,
									category: product.category,
								} as any,
								snapshotAfter: null,
								adminSnapshot: userData as any,
							},
						});
					}

					// Удаляем связи фильтров
					await chunkedDeleteMany(numericIds, (chunk) =>
						tx.productFilterValue.deleteMany({
							where: { productId: { in: chunk } },
						})
					);

					// Чистим "висячие" значения фильтров
					await tx.filterValue.deleteMany({
						where: {
							productFilterValues: {
								none: {},
							},
						},
					});

					// Удаляем связи аналогов
					await chunkedDeleteMany(numericIds, (chunk) =>
						tx.productAnalog.deleteMany({
							where: {
								OR: [{ productId: { in: chunk } }, { analogId: { in: chunk } }],
							},
						})
					);

					// Удаляем связи аналогов в комплектах
					await chunkedDeleteMany(numericIds, (chunk) =>
						tx.serviceKitItemAnalog.deleteMany({
							where: {
								analogProductId: { in: chunk },
							},
						})
					);

					// Удаляем связи комплектов
					await chunkedDeleteMany(numericIds, (chunk) =>
						tx.serviceKitItem.deleteMany({
							where: {
								product_id: { in: chunk },
							},
						})
					);

					// Удаляем сами товары (логи уже созданы)
					await chunkedDeleteMany(numericIds, (chunk) =>
						tx.product.deleteMany({
							where: { id: { in: chunk } },
						})
					);
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
