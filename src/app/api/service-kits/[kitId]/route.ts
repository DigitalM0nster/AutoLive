// src/app/api/service-kits/[kitId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { ServiceKit, ServiceKitSnapshotForLog, AdminSnapshotForBookingLog } from "@/lib/types";

type RouteParams = {
	params: Promise<{
		kitId: string;
	}>;
};

// GET /api/service-kits/[kitId] - Получить один комплект ТО по ID
async function getServiceKitHandler(req: NextRequest, { user, params }: { user: any; params: Promise<{ kitId: string }> }) {
	try {
		const { kitId } = await params;
		const kitIdNumber = parseInt(kitId, 10);

		if (isNaN(kitIdNumber)) {
			return NextResponse.json({ error: "Неверный ID комплекта" }, { status: 400 });
		}

		// Получаем комплект ТО по ID
		const kit = await prisma.serviceKit.findUnique({
			where: { id: kitIdNumber },
			include: {
				kitItems: {
					include: {
						product: {
							select: {
								id: true,
								title: true,
								sku: true,
								brand: true,
								price: true,
								image: true,
							},
						},
						analogs: {
							include: {
								analogProduct: {
									select: {
										id: true,
										title: true,
										sku: true,
										brand: true,
										price: true,
										image: true,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!kit) {
			return NextResponse.json({ error: "Комплект не найден" }, { status: 404 });
		}

		// Форматируем данные для фронтенда (упрощённая структура product/analogProduct)
		const formattedKit = {
			id: kit.id,
			title: kit.title,
			name: kit.title,
			description: kit.description || "",
			image: kit.image || "/images/no-image.png",
			price: kit.price,
			createdAt: kit.createdAt.toISOString(),
			updatedAt: kit.updatedAt.toISOString(),
			kitItems: kit.kitItems.map((item) => ({
				id: item.id,
				kitId: item.kit_id,
				productId: item.product_id,
				product: item.product,
				analogs: item.analogs.map((analog) => ({
					id: analog.id,
					serviceKitItemId: analog.serviceKitItemId,
					analogProductId: analog.analogProductId,
					analogProduct: analog.analogProduct,
				})),
			})),
		} as ServiceKit;

		return NextResponse.json(formattedKit);
	} catch (error) {
		console.error("Ошибка при получении комплекта ТО:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// PUT /api/service-kits/[kitId] - Обновить комплект ТО
async function updateServiceKitHandler(req: NextRequest, { user, params }: { user: any; params: Promise<{ kitId: string }> }) {
	try {
		const { kitId } = await params;
		const kitIdNumber = parseInt(kitId, 10);

		if (isNaN(kitIdNumber)) {
			return NextResponse.json({ error: "Неверный ID комплекта" }, { status: 400 });
		}

		const body = await req.json();

		// Проверяем существование комплекта
		const existingKit = await prisma.serviceKit.findUnique({
			where: { id: kitIdNumber },
		});

		if (!existingKit) {
			return NextResponse.json({ error: "Комплект не найден" }, { status: 404 });
		}

		// Получаем полную информацию о пользователе из базы данных
		const fullUser = await prisma.user.findUnique({
			where: { id: user.id },
			include: {
				department: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!fullUser) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Валидация данных
		if (body.title !== undefined && (!body.title || !body.title.trim())) {
			return NextResponse.json({ error: "Название комплекта обязательно" }, { status: 400 });
		}

		if (body.price !== undefined && body.price < 0) {
			return NextResponse.json({ error: "Цена должна быть неотрицательной" }, { status: 400 });
		}

		// Обновляем комплект ТО в транзакции
		const updatedKit = await prisma.$transaction(async (tx) => {
			// Подготавливаем данные для обновления
			const updateData: any = {};

			if (body.title !== undefined) {
				updateData.title = body.title.trim();
			}
			if (body.description !== undefined) {
				updateData.description = body.description || null;
			}
			if (body.image !== undefined) {
				updateData.image = body.image || null;
			}
			if (body.price !== undefined) {
				updateData.price = body.price;
			}

			// Обновляем комплект
			const kit = await tx.serviceKit.update({
				where: { id: kitIdNumber },
				data: updateData,
			});

			// Если передан массив kitItems, обновляем элементы комплекта
			if (body.kitItems !== undefined && Array.isArray(body.kitItems)) {
				// Удаляем все существующие элементы комплекта
				await tx.serviceKitItemAnalog.deleteMany({
					where: {
						serviceKitItem: {
							kit_id: kitIdNumber,
						},
					},
				});

				await tx.serviceKitItem.deleteMany({
					where: {
						kit_id: kitIdNumber,
					},
				});

				// Создаем новые элементы комплекта
				for (const item of body.kitItems) {
					// Проверяем существование товара
					const product = await tx.product.findUnique({
						where: { id: item.productId },
					});

					if (!product) {
						throw new Error(`Товар с ID ${item.productId} не найден`);
					}

					const kitItem = await tx.serviceKitItem.create({
						data: {
							kit_id: kitIdNumber,
							product_id: item.productId,
						},
					});

					// Если есть аналоги, создаем их
					if (item.analogProductIds && Array.isArray(item.analogProductIds) && item.analogProductIds.length > 0) {
						// Проверяем существование всех аналогов
						const analogProducts = await tx.product.findMany({
							where: {
								id: { in: item.analogProductIds },
							},
						});

						if (analogProducts.length !== item.analogProductIds.length) {
							throw new Error("Один или несколько аналогов не найдены");
						}

						// Создаем аналоги для элемента комплекта
						await tx.serviceKitItemAnalog.createMany({
							data: item.analogProductIds.map((analogId: number) => ({
								serviceKitItemId: kitItem.id,
								analogProductId: analogId,
							})),
						});
					}
				}
			}

			// Подготавливаем снапшоты для лога
			const adminSnapshot: AdminSnapshotForBookingLog = {
				id: fullUser.id,
				first_name: fullUser.first_name,
				last_name: fullUser.last_name,
				role: fullUser.role,
				department: fullUser.department
					? {
							id: fullUser.department.id,
							name: fullUser.department.name,
					  }
					: null,
			};

			const serviceKitSnapshot: ServiceKitSnapshotForLog = {
				id: kit.id,
				title: kit.title,
				description: kit.description,
				image: kit.image,
				price: kit.price,
			};

			// Создаем лог обновления комплекта
			await tx.serviceKitLog.create({
				data: {
					action: "update",
					message: `Комплект ТО обновлен`,
					serviceKitId: kit.id,
					adminSnapshot,
					serviceKitSnapshot,
				},
			});

			// Получаем полный комплект с элементами и аналогами
			return await tx.serviceKit.findUnique({
				where: { id: kitIdNumber },
				include: {
					kitItems: {
						include: {
							product: {
								select: {
									id: true,
									title: true,
									sku: true,
									brand: true,
									price: true,
									image: true,
								},
							},
							analogs: {
								include: {
									analogProduct: {
										select: {
											id: true,
											title: true,
											sku: true,
											brand: true,
											price: true,
											image: true,
										},
									},
								},
							},
						},
					},
				},
			});
		});

		if (!updatedKit) {
			return NextResponse.json({ error: "Ошибка при обновлении комплекта" }, { status: 500 });
		}

		// Форматируем данные для фронтенда (упрощённая структура product/analogProduct)
		const formattedKit = {
			id: updatedKit.id,
			title: updatedKit.title,
			name: updatedKit.title,
			description: updatedKit.description || "",
			image: updatedKit.image || "/images/no-image.png",
			price: updatedKit.price,
			createdAt: updatedKit.createdAt.toISOString(),
			updatedAt: updatedKit.updatedAt.toISOString(),
			kitItems: updatedKit.kitItems.map((item) => ({
				id: item.id,
				kitId: item.kit_id,
				productId: item.product_id,
				product: item.product,
				analogs: item.analogs.map((analog) => ({
					id: analog.id,
					serviceKitItemId: analog.serviceKitItemId,
					analogProductId: analog.analogProductId,
					analogProduct: analog.analogProduct,
				})),
			})),
		} as ServiceKit;

		return NextResponse.json(formattedKit);
	} catch (error: any) {
		console.error("Ошибка при обновлении комплекта ТО:", error);
		return NextResponse.json({ error: error.message || "Ошибка сервера" }, { status: 500 });
	}
}

// DELETE /api/service-kits/[kitId] - Удалить комплект ТО
async function deleteServiceKitHandler(req: NextRequest, { user, params }: { user: any; params: Promise<{ kitId: string }> }) {
	try {
		const { kitId } = await params;
		const kitIdNumber = parseInt(kitId, 10);

		if (isNaN(kitIdNumber)) {
			return NextResponse.json({ error: "Неверный ID комплекта" }, { status: 400 });
		}

		// Проверяем существование комплекта
		const existingKit = await prisma.serviceKit.findUnique({
			where: { id: kitIdNumber },
		});

		if (!existingKit) {
			return NextResponse.json({ error: "Комплект не найден" }, { status: 404 });
		}

		// Получаем полную информацию о пользователе из базы данных
		const fullUser = await prisma.user.findUnique({
			where: { id: user.id },
			include: {
				department: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!fullUser) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Удаляем комплект ТО в транзакции
		await prisma.$transaction(async (tx) => {
			// Подготавливаем снапшоты для лога
			const adminSnapshot: AdminSnapshotForBookingLog = {
				id: fullUser.id,
				first_name: fullUser.first_name,
				last_name: fullUser.last_name,
				role: fullUser.role,
				department: fullUser.department
					? {
							id: fullUser.department.id,
							name: fullUser.department.name,
					  }
					: null,
			};

			const serviceKitSnapshot: ServiceKitSnapshotForLog = {
				id: existingKit.id,
				title: existingKit.title,
				description: existingKit.description,
				image: existingKit.image,
				price: existingKit.price,
			};

			// Создаем лог удаления комплекта
			await tx.serviceKitLog.create({
				data: {
					action: "delete",
					message: `Комплект ТО удален`,
					serviceKitId: existingKit.id,
					adminSnapshot,
					serviceKitSnapshot,
				},
			});

			// Удаляем комплект (каскадное удаление элементов и аналогов произойдет автоматически)
			await tx.serviceKit.delete({
				where: { id: kitIdNumber },
			});
		});

		return NextResponse.json({ message: "Комплект ТО успешно удален" });
	} catch (error: any) {
		console.error("Ошибка при удалении комплекта ТО:", error);
		return NextResponse.json({ error: error.message || "Ошибка сервера" }, { status: 500 });
	}
}

export const GET = withPermission(getServiceKitHandler, "view_products", ["superadmin", "admin", "manager"]);
export const PUT = withPermission(updateServiceKitHandler, "edit_products", ["superadmin", "admin"]);
export const DELETE = withPermission(deleteServiceKitHandler, "edit_products", ["superadmin", "admin"]);
