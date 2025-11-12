import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";

// Назначение заказа менеджеру
async function assignOrderHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const orderId = parseInt(req.url.split("/").slice(-3, -1)[0]); // Извлекаем orderId из URL
		const body = await req.json();
		let { managerId } = body;

		// Менеджер может назначить заказ только на себя (логика "взял в работу").
		if (scope === "own") {
			managerId = user.id;
		}

		if (isNaN(orderId)) {
			return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
		}

		if (!managerId) {
			return NextResponse.json({ error: "Manager ID is required" }, { status: 400 });
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

		// Проверяем, что админ/менеджер вообще привязан к отделу.
		if ((user.role === "admin" || user.role === "manager") && !fullUser.departmentId) {
			return NextResponse.json({ error: "Нельзя назначать заказ без привязки к отделу" }, { status: 400 });
		}

		// Базовые условия для проверки доступа
		let whereClause: any = {};

		// Логика доступа по scope
		if (scope === "all") {
			// Суперадмин может назначать любые заказы
			whereClause = { id: orderId };
		} else if (scope === "department") {
			// Админ может назначать заказы своего отдела и свободные заказы
			whereClause = {
				id: orderId,
				OR: [
					{ departmentId: fullUser.departmentId },
					{ managerId: null }, // Свободные заказы
				],
			};
		} else if (scope === "own") {
			// Менеджер может брать только свободные заказы
			whereClause = {
				id: orderId,
				managerId: null, // Только свободные заказы
			};
		}

		// Проверяем права доступа к заказу
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
			},
		});

		if (!order) {
			return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
		}

		// Менеджер может брать только заказы своего отдела (если отдел указан).
		if (scope === "own" && order.departmentId && order.departmentId !== fullUser.departmentId) {
			return NextResponse.json({ error: "Менеджер может брать только заказы своего отдела" }, { status: 403 });
		}

		// Проверяем, что заказ свободен (если назначает не суперадмин)
		if (scope !== "all" && order.managerId !== null) {
			return NextResponse.json({ error: "Order is already assigned to a manager" }, { status: 400 });
		}

		// Проверяем, что менеджер существует и принадлежит к нужному отделу
		const manager = await prisma.user.findFirst({
			where: {
				id: managerId,
				OR: [
					{ role: { in: ["admin", "manager"] } },
					{
						id: fullUser.id,
						role: "superadmin",
					},
				],
				// Если это не суперадмин, убедимся, что отдел совпадает с отделом заказа (если он есть).
				...(order.departmentId && !(managerId === fullUser.id && fullUser.role === "superadmin")
					? {
							departmentId: order.departmentId,
					  }
					: {}),
			},
			include: {
				department: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!manager) {
			return NextResponse.json({ error: "Manager not found or does not belong to the required department" }, { status: 400 });
		}

		// Нельзя назначать администратора без отдела или менеджера без отдела
		if (["admin", "manager"].includes(manager.role) && !manager.departmentId) {
			return NextResponse.json({ error: "Нельзя назначить ответственного без отдела" }, { status: 400 });
		}

		// Администратор может назначить только себя или менеджеров своего отдела.
		if (scope === "department" && fullUser.role === "admin") {
			if (manager.role === "admin" && manager.id !== fullUser.id) {
				return NextResponse.json({ error: "Админ может назначить ответственным только себя" }, { status: 400 });
			}
			if (manager.departmentId !== fullUser.departmentId) {
				return NextResponse.json({ error: "Можно назначать только сотрудников своего отдела" }, { status: 400 });
			}
		}

		// Менеджер (scope own) может назначить только себя.
		if (scope === "own" && manager.id !== fullUser.id) {
			return NextResponse.json({ error: "Менеджер может брать заказы только на себя" }, { status: 400 });
		}

		// Назначаем заказ в транзакции
		const assignedOrder = await prisma.$transaction(async (tx) => {
			// Обновляем заказ
			const updatedOrder = await tx.order.update({
				where: { id: orderId },
				data: {
					managerId: managerId,
					assignedAt: new Date(),
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

			// Создаем лог назначения
			await tx.orderLog.create({
				data: {
					action: "assign",
					message: `Заказ назначен менеджеру ${manager.first_name} ${manager.last_name}`,
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
						id: updatedOrder.id,
						status: updatedOrder.status,
						managerId: updatedOrder.managerId,
						departmentId: updatedOrder.departmentId,
						clientId: updatedOrder.clientId,
					},
					managerSnapshot: {
						id: manager.id,
						first_name: manager.first_name,
						last_name: manager.last_name,
						role: manager.role,
						department: manager.department
							? {
									id: manager.department.id,
									name: manager.department.name,
							  }
							: null,
					},
				},
			});

			return updatedOrder;
		});

		return NextResponse.json({
			order: assignedOrder,
			message: "Order assigned successfully",
		});
	} catch (error) {
		console.error("Error assigning order:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Снятие назначения с заказа
async function unassignOrderHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const orderId = parseInt(req.url.split("/").slice(-3, -1)[0]); // Извлекаем orderId из URL

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

		// Только суперадмин и админ могут снимать назначения
		if (scope === "all") {
			// Суперадмин может снимать любые назначения
			whereClause = { id: orderId };
		} else if (scope === "department") {
			// Админ может снимать назначения с заказов своего отдела
			whereClause = {
				id: orderId,
				departmentId: fullUser.departmentId,
			};
		} else {
			// Менеджеры не могут снимать назначения
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}

		// Проверяем права доступа к заказу
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
			},
		});

		if (!order) {
			return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
		}

		if (!order.managerId) {
			return NextResponse.json({ error: "Order is not assigned to any manager" }, { status: 400 });
		}

		// Снимаем назначение в транзакции
		const unassignedOrder = await prisma.$transaction(async (tx) => {
			// Обновляем заказ
			const updatedOrder = await tx.order.update({
				where: { id: orderId },
				data: {
					managerId: null,
					assignedAt: null,
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

			// Создаем лог снятия назначения
			await tx.orderLog.create({
				data: {
					action: "unassign",
					message: `Назначение снято с менеджера ${order.manager?.first_name} ${order.manager?.last_name}`,
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
						id: updatedOrder.id,
						status: updatedOrder.status,
						managerId: updatedOrder.managerId,
						departmentId: updatedOrder.departmentId,
						clientId: updatedOrder.clientId,
					},
					managerSnapshot: order.manager
						? {
								id: order.manager.id,
								first_name: order.manager.first_name,
								last_name: order.manager.last_name,
								role: order.manager.role,
								department: order.manager.department
									? {
											id: order.manager.department.id,
											name: order.manager.department.name,
									  }
									: null,
						  }
						: undefined,
				},
			});

			return updatedOrder;
		});

		return NextResponse.json({
			order: unassignedOrder,
			message: "Order unassigned successfully",
		});
	} catch (error) {
		console.error("Error unassigning order:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Экспорт с проверкой разрешений
export const POST = withPermission(assignOrderHandler, "assign_orders", ["superadmin", "admin", "manager"]);
export const DELETE = withPermission(unassignOrderHandler, "assign_orders", ["superadmin", "admin"]);
