// src/app/api/service-kits/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";
import { ServiceKit, ServiceKitSnapshotForLog, AdminSnapshotForBookingLog } from "@/lib/types";

// GET /api/service-kits - Получить список всех комплектов ТО
async function getServiceKitsHandler(req: NextRequest, { user }: { user: any }) {
	try {
		const { searchParams } = new URL(req.url);

		// Параметры пагинации
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const skip = (page - 1) * limit;

		// Получаем комплекты ТО с пагинацией
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const [kits, total] = await withDbRetry(async () => {
			return await Promise.all([
				prisma.serviceKit.findMany({
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
					orderBy: {
						createdAt: "desc",
					},
					skip,
					take: limit,
				}),
				prisma.serviceKit.count(),
			]);
		});

		const totalPages = Math.ceil(total / limit);

		// Форматируем данные для фронтенда
		const formattedKits: ServiceKit[] = kits.map((kit) => ({
			id: kit.id,
			title: kit.title,
			name: kit.title, // Для совместимости
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
		}));

		return NextResponse.json({
			kits: formattedKits,
			total,
			page,
			totalPages,
		});
	} catch (error) {
		console.error("Ошибка при получении комплектов ТО:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// POST /api/service-kits - Создать новый комплект ТО
async function createServiceKitHandler(req: NextRequest, { user }: { user: any }) {
	try {
		const body = await req.json();

		// Валидация данных
		if (!body.title || !body.title.trim()) {
			return NextResponse.json({ error: "Название комплекта обязательно" }, { status: 400 });
		}

		if (!body.price || body.price < 0) {
			return NextResponse.json({ error: "Цена должна быть неотрицательной" }, { status: 400 });
		}

		if (!body.kitItems || !Array.isArray(body.kitItems) || body.kitItems.length === 0) {
			return NextResponse.json({ error: "Комплект должен содержать хотя бы один товар" }, { status: 400 });
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

		// Проверяем существование всех товаров
		const productIds = body.kitItems.map((item: any) => item.productId);
		const products = await prisma.product.findMany({
			where: {
				id: { in: productIds },
			},
		});

		if (products.length !== productIds.length) {
			return NextResponse.json({ error: "Один или несколько товаров не найдены" }, { status: 400 });
		}

		// Создаем комплект ТО в транзакции
		const serviceKit = await prisma.$transaction(async (tx) => {
			// Создаем комплект ТО
			const newKit = await tx.serviceKit.create({
				data: {
					title: body.title.trim(),
					description: body.description || null,
					image: body.image || null,
					price: body.price,
				},
			});

			// Создаем элементы комплекта
			for (const item of body.kitItems) {
				const kitItem = await tx.serviceKitItem.create({
					data: {
						kit_id: newKit.id,
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
				id: newKit.id,
				title: newKit.title,
				description: newKit.description,
				image: newKit.image,
				price: newKit.price,
			};

			// Создаем лог создания комплекта
			await tx.serviceKitLog.create({
				data: {
					action: "create",
					message: `Комплект ТО создан`,
					serviceKitId: newKit.id,
					adminSnapshot,
					serviceKitSnapshot,
				},
			});

			// Получаем полный комплект с элементами и аналогами
			return await tx.serviceKit.findUnique({
				where: { id: newKit.id },
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

		if (!serviceKit) {
			return NextResponse.json({ error: "Ошибка при создании комплекта" }, { status: 500 });
		}

		// Форматируем данные для фронтенда
		const formattedKit: ServiceKit = {
			id: serviceKit.id,
			title: serviceKit.title,
			name: serviceKit.title,
			description: serviceKit.description || "",
			image: serviceKit.image || "/images/no-image.png",
			price: serviceKit.price,
			createdAt: serviceKit.createdAt.toISOString(),
			updatedAt: serviceKit.updatedAt.toISOString(),
			kitItems: serviceKit.kitItems.map((item) => ({
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
		};

		return NextResponse.json(formattedKit, { status: 201 });
	} catch (error: any) {
		console.error("Ошибка при создании комплекта ТО:", error);
		return NextResponse.json({ error: error.message || "Ошибка сервера" }, { status: 500 });
	}
}

export const GET = withPermission(getServiceKitsHandler, "view_products", ["superadmin", "admin", "manager"]);
export const POST = withPermission(createServiceKitHandler, "edit_products", ["superadmin", "admin"]);
