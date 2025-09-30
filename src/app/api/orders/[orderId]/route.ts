import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { OrderResponse, UpdateOrderRequest } from "@/lib/types";

// Получение конкретного заказа
async function getOrderHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const orderId = parseInt(req.url.split("/").slice(-2, -1)[0]); // Извлекаем orderId из URL

		if (isNaN(orderId)) {
			return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
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

		// Базовые условия для фильтрации по scope
		let whereClause: any = {};

		// Логика доступа по scope
		if (scope === "all") {
			// Суперадмин видит все заказы
			whereClause = { id: orderId };
		} else if (scope === "department") {
			// Админ видит заказы своего отдела, свободные заказы и свои
			whereClause = {
				id: orderId,
				OR: [
					{ managerId: null }, // Свободные заказы
					{ departmentId: fullUser.departmentId }, // Заказы отдела
					{ managerId: fullUser.id }, // Свои заказы
				],
			};
		} else if (scope === "own") {
			// Менеджер видит свободные заказы и свои
			whereClause = {
				id: orderId,
				OR: [
					{ managerId: null }, // Свободные заказы
					{ managerId: fullUser.id }, // Свои заказы
				],
			};
		}

		// Получаем заказ с проверкой доступа
		const order = await prisma.order.findFirst({
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
		});

		if (!order) {
			return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
		}

		const response: OrderResponse = {
			order,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error fetching order:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Обновление заказа
async function updateOrderHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const orderId = parseInt(req.url.split("/").slice(-2, -1)[0]); // Извлекаем orderId из URL
		const body: UpdateOrderRequest = await req.json();

		if (isNaN(orderId)) {
			return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
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

		// Базовые условия для проверки доступа
		let whereClause: any = {};

		// Логика доступа по scope
		if (scope === "all") {
			// Суперадмин может редактировать все
			whereClause = { id: orderId };
		} else if (scope === "department") {
			// Админ может редактировать заказы своего отдела и свои
			whereClause = {
				id: orderId,
				OR: [{ departmentId: fullUser.departmentId }, { managerId: fullUser.id }],
			};
		} else if (scope === "own") {
			// Менеджер может редактировать только свои заказы
			whereClause = {
				id: orderId,
				managerId: fullUser.id,
			};
		}

		// Получаем текущий заказ для проверки доступа
		const currentOrder = await prisma.order.findFirst({
			where: whereClause,
		});

		if (!currentOrder) {
			return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
		}

		// Обновляем заказ в транзакции
		const updatedOrder = await prisma.$transaction(async (tx) => {
			// Подготавливаем данные для обновления
			const updateData: any = {};

			if (body.title !== undefined) updateData.title = body.title;
			if (body.description !== undefined) updateData.description = body.description;
			if (body.status !== undefined) updateData.status = body.status;

			// Логика назначения менеджера
			if (body.managerId !== undefined) {
				if (body.managerId === null) {
					// Снимаем назначение
					updateData.managerId = null;
					updateData.assignedAt = null;
				} else {
					// Назначаем менеджера
					updateData.managerId = body.managerId;
					updateData.assignedAt = new Date();
				}
			}

			if (body.departmentId !== undefined) {
				updateData.departmentId = body.departmentId;
			}

			// Обновляем заказ
			const order = await tx.order.update({
				where: { id: orderId },
				data: updateData,
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

			// Создаем лог изменения
			let action = "update";
			let message = "Заказ обновлен";

			if (body.status && body.status !== currentOrder.status) {
				action = "status_change";
				message = `Статус заказа изменен на "${body.status}"`;
			}

			if (body.managerId !== undefined && body.managerId !== currentOrder.managerId) {
				if (body.managerId === null) {
					action = "unassign";
					message = "Менеджер снят с заказа";
				} else {
					action = "assign";
					message = "Заказ назначен менеджеру";
				}
			}

			await tx.orderLog.create({
				data: {
					action,
					message,
					orderId: orderId,
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
						id: order.id,
						title: order.title,
						status: order.status,
						managerId: order.managerId,
						departmentId: order.departmentId,
						clientId: order.clientId,
					},
				},
			});

			return order;
		});

		const response: OrderResponse = {
			order: updatedOrder,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error updating order:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Экспорт с проверкой разрешений
export const GET = withPermission(getOrderHandler, "view_orders", ["superadmin", "admin", "manager"]);
export const PUT = withPermission(updateOrderHandler, "manage_orders", ["superadmin", "admin", "manager"]);
