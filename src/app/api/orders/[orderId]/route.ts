import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { OrderResponse, UpdateOrderRequest } from "@/lib/types";

// Получение конкретного заказа
async function getOrderHandler(req: NextRequest, { user, scope, params }: { user: any; scope: "all" | "department" | "own"; params: { orderId: string } }) {
	try {
		const orderId = parseInt(params.orderId); // Извлекаем orderId из параметров

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
async function updateOrderHandler(req: NextRequest, { user, scope, params }: { user: any; scope: "all" | "department" | "own"; params: { orderId: string } }) {
	try {
		const orderId = parseInt(params.orderId); // Извлекаем orderId из параметров
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

		const statusTimeline = ["created", "confirmed", "booked", "ready", "paid", "completed", "returned"] as const;
		const currentStatusIndex = statusTimeline.indexOf(currentOrder.status as (typeof statusTimeline)[number]);

		if (user.role === "manager") {
			if (body.status) {
				const requestedStatusIndex = statusTimeline.indexOf(body.status as (typeof statusTimeline)[number]);
				if (requestedStatusIndex !== -1 && requestedStatusIndex < currentStatusIndex) {
					return NextResponse.json({ error: "Менеджер не может откатывать статус назад" }, { status: 400 });
				}
			}

			if (currentStatusIndex > 0) {
				if (body.managerId !== undefined || body.departmentId !== undefined || body.finalDeliveryDate !== undefined) {
					return NextResponse.json({ error: "Менеджеру запрещено изменять данные уже подтверждённых статусов" }, { status: 400 });
				}
			}
		}

		let targetManagerId: number | null | undefined = body.managerId !== undefined ? body.managerId : currentOrder.managerId;
		let targetDepartmentId: number | null | undefined = body.departmentId !== undefined ? body.departmentId : currentOrder.departmentId;

		let responsibleUser: {
			id: number;
			role: string;
			departmentId: number | null;
		} | null = null;

		if (targetManagerId !== undefined && targetManagerId !== null) {
			responsibleUser = await prisma.user.findUnique({
				where: { id: targetManagerId },
				select: {
					id: true,
					role: true,
					departmentId: true,
				},
			});

			if (!responsibleUser) {
				return NextResponse.json({ error: "Ответственный не найден" }, { status: 400 });
			}

			if (["admin", "manager"].includes(responsibleUser.role) && !responsibleUser.departmentId) {
				return NextResponse.json({ error: "Ответственный без отдела не может быть назначен" }, { status: 400 });
			}

			if (user.role === "admin") {
				if (responsibleUser.role === "admin" && responsibleUser.id !== fullUser.id) {
					return NextResponse.json({ error: "Админ может назначить ответственным только себя" }, { status: 400 });
				}
				if (responsibleUser.departmentId !== fullUser.departmentId) {
					return NextResponse.json({ error: "Можно назначать только сотрудников своего отдела" }, { status: 400 });
				}
				targetDepartmentId = fullUser.departmentId;
			}

			if (user.role === "superadmin") {
				const isSelf = targetManagerId === fullUser.id;
				if (isSelf) {
					targetDepartmentId = null;
				} else {
					if (!["admin", "manager"].includes(responsibleUser.role)) {
						return NextResponse.json({ error: "Ответственным может быть только админ или менеджер" }, { status: 400 });
					}
					if (!targetDepartmentId) {
						return NextResponse.json({ error: "Для назначения сотрудника выберите отдел" }, { status: 400 });
					}
					if (responsibleUser.departmentId !== targetDepartmentId) {
						return NextResponse.json({ error: "Ответственный должен принадлежать выбранному отделу" }, { status: 400 });
					}
				}
			}

			if (user.role === "manager" && targetManagerId !== fullUser.id) {
				return NextResponse.json({ error: "Менеджер может обновлять назначение только на себя" }, { status: 400 });
			}

			if (targetDepartmentId && responsibleUser.departmentId && responsibleUser.id !== fullUser.id && responsibleUser.departmentId !== targetDepartmentId) {
				return NextResponse.json({ error: "Ответственный должен быть из выбранного отдела" }, { status: 400 });
			}
		} else if (user.role === "manager") {
			// Менеджер не может оставить заказ без ответственного
			targetManagerId = fullUser.id;
		}

		if (targetDepartmentId !== undefined && targetDepartmentId !== null) {
			const existingDepartment = await prisma.department.findUnique({
				where: { id: targetDepartmentId },
				select: { id: true },
			});

			if (!existingDepartment) {
				return NextResponse.json({ error: "Указан несуществующий отдел" }, { status: 400 });
			}
		}

		let finalDeliveryDateValue: Date | null | undefined = undefined;
		if (body.finalDeliveryDate !== undefined) {
			if (body.finalDeliveryDate === null) {
				finalDeliveryDateValue = null;
			} else {
				const parsed = new Date(body.finalDeliveryDate);
				if (isNaN(parsed.getTime())) {
					return NextResponse.json({ error: "Некорректная дата финальной поставки клиенту" }, { status: 400 });
				}
				finalDeliveryDateValue = parsed;
			}
		}

		// Обновляем заказ в транзакции
		const updatedOrder = await prisma.$transaction(async (tx) => {
			// Подготавливаем данные для обновления
			const updateData: any = {};

			if (body.comments !== undefined) updateData.comments = body.comments;
			if (body.status !== undefined) {
				updateData.status = body.status;
				if (body.status === "confirmed" && currentOrder.status !== "confirmed") {
					updateData.confirmationDate = new Date();
				}
			}

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

			if (user.role === "superadmin" && targetManagerId === fullUser.id) {
				updateData.departmentId = null;
			}

			if (finalDeliveryDateValue !== undefined) {
				updateData.finalDeliveryDate = finalDeliveryDateValue;
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
						status: order.status,
						managerId: order.managerId,
						departmentId: order.departmentId,
						clientId: order.clientId,
						confirmationDate: (order as any).confirmationDate ?? null,
						finalDeliveryDate: (order as any).finalDeliveryDate ?? null,
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
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
	const resolvedParams = await params;
	return withPermission(getOrderHandler, "view_orders", ["superadmin", "admin", "manager"])(req, { params: resolvedParams });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
	const resolvedParams = await params;
	return withPermission(updateOrderHandler, "manage_orders", ["superadmin", "admin", "manager"])(req, { params: resolvedParams });
}
