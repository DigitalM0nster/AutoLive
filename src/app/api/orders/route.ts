import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { OrderResponse, CreateOrderRequest } from "@/lib/types";

// Получение списка заказов с фильтрацией по ролям
async function getOrdersHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const { searchParams } = new URL(req.url);

		// Параметры пагинации
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const skip = (page - 1) * limit;

		// Параметры фильтрации
		const status = searchParams.get("status");
		const managerId = searchParams.get("managerId");
		const departmentId = searchParams.get("departmentId");
		const clientId = searchParams.get("clientId");

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
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Базовые условия для фильтрации по ролям
		let whereClause: any = {};

		// Логика доступа по scope
		if (scope === "all") {
			// Суперадмин видит все заказы
			// Никаких дополнительных ограничений
		} else if (scope === "department") {
			// Админ видит:
			// 1. Заказы без назначенного менеджера (свободные)
			// 2. Заказы своего отдела
			// 3. Заказы, которые он сам выполняет
			whereClause = {
				OR: [
					// Свободные заказы
					{ managerId: null },
					// Заказы своего отдела
					{ departmentId: fullUser.departmentId },
					// Заказы, которые админ сам выполняет
					{ managerId: fullUser.id },
				],
			};
		} else if (scope === "own") {
			// Менеджер видит:
			// 1. Заказы без назначенного менеджера (свободные)
			// 2. Заказы, которые он сам выполняет
			whereClause = {
				OR: [
					// Свободные заказы
					{ managerId: null },
					// Заказы, которые менеджер сам выполняет
					{ managerId: fullUser.id },
				],
			};
		}

		// Добавляем дополнительные фильтры
		if (status) {
			whereClause.status = status;
		}
		if (managerId) {
			whereClause.managerId = parseInt(managerId);
		}
		if (departmentId) {
			whereClause.departmentId = parseInt(departmentId);
		}
		if (clientId) {
			whereClause.clientId = parseInt(clientId);
		}

		// Получаем заказы с пагинацией
		const [orders, total] = await Promise.all([
			prisma.order.findMany({
				where: whereClause,
				include: {
					manager: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							role: true,
							department: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
					department: {
						select: {
							id: true,
							name: true,
						},
					},
					client: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							phone: true,
						},
					},
					creator: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							role: true,
							department: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
					orderItems: true,
				},
				orderBy: {
					createdAt: "desc",
				},
				skip,
				take: limit,
			}),
			prisma.order.count({
				where: whereClause,
			}),
		]);

		const totalPages = Math.ceil(total / limit);

		const response: OrderResponse = {
			orders,
			total,
			page,
			totalPages,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error fetching orders:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Создание нового заказа
async function createOrderHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const body: CreateOrderRequest = await req.json();

		// Валидация данных
		if (!body.orderItems || body.orderItems.length === 0) {
			return NextResponse.json({ error: "Order items are required" }, { status: 400 });
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
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Логика определения отдела для заказа
		let departmentId = body.departmentId;

		// Получаем отделы товаров в заказе
		const productSkus = body.orderItems.map((item) => item.product_sku);
		const products = await prisma.product.findMany({
			where: {
				sku: { in: productSkus },
			},
			select: {
				sku: true,
				departmentId: true,
			},
		});

		// Определяем уникальные отделы товаров
		const productDepartments = [...new Set(products.map((p) => p.departmentId).filter((id) => id !== null))];

		// Логика определения отдела:
		// 1. Если все товары из одного отдела - заказ попадает в этот отдел
		// 2. Если товары из разных отделов:
		//    - Если создает админ/менеджер - заказ попадает в их отдел
		//    - Если создает пользователь - заказ без отдела
		if (productDepartments.length === 1) {
			// Все товары из одного отдела
			departmentId = productDepartments[0];
		} else if (productDepartments.length > 1) {
			// Товары из разных отделов
			if (user.role === "admin" || user.role === "manager") {
				// Заказ попадает в отдел создателя
				departmentId = fullUser.departmentId || undefined;
			} else {
				// Заказ без отдела (от пользователя)
				departmentId = undefined;
			}
		}

		// Если суперадмин указал отдел вручную - используем его
		if (user.role === "superadmin" && body.departmentId) {
			departmentId = body.departmentId;
		}

		// Создаем заказ в транзакции
		const order = await prisma.$transaction(async (tx) => {
			// Создаем заказ
			const newOrder = await tx.order.create({
				data: {
					comments: [],
					status: "created",
					clientId: body.clientId || null,
					managerId: body.managerId || null,
					departmentId: departmentId,
					createdBy: fullUser.id,
					// Поле assignedAt остается null для свободных заказов
				},
				include: {
					manager: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							role: true,
							department: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
					department: {
						select: {
							id: true,
							name: true,
						},
					},
					client: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							phone: true,
						},
					},
					creator: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							role: true,
							department: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
					orderItems: true,
				},
			});

			// Создаем позиции заказа
			await tx.orderItem.createMany({
				data: body.orderItems.map((item) => ({
					orderId: newOrder.id,
					product_sku: item.product_sku,
					product_title: item.product_title,
					product_price: item.product_price,
					product_brand: item.product_brand,
					product_image: item.product_image || null,
					quantity: item.quantity,
				})),
			});

			// Создаем лог создания заказа
			await tx.orderLog.create({
				data: {
					action: "create",
					message: `Заказ создан`,
					orderId: newOrder.id,
					adminSnapshot: {
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
					},
					orderSnapshot: {
						id: newOrder.id,
						status: newOrder.status,
						managerId: newOrder.managerId,
						departmentId: newOrder.departmentId,
						clientId: newOrder.clientId,
					},
				},
			});

			return newOrder;
		});

		const response: OrderResponse = {
			order,
		};

		return NextResponse.json(response, { status: 201 });
	} catch (error) {
		console.error("Error creating order:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Экспорт с проверкой разрешений
export const GET = withPermission(getOrdersHandler, "view_orders", ["superadmin", "admin", "manager"]);
export const POST = withPermission(createOrderHandler, "create_orders", ["superadmin", "admin", "manager"]);
