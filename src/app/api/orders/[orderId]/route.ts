import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { OrderResponse, UpdateOrderRequest, Order, OrderStatus } from "@/lib/types";
import { validateOrderMergedStateForStatus } from "@/lib/orderStatusValidation";
import { getFullOrderSnapshot } from "@/lib/crossLogging";
import { mergeOrderCommentsOnUpdate } from "@/lib/orderComments";
import { buildOrderUpdateMessage } from "@/lib/orderUpdateDiff";

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
			// Менеджер видит все заказы (только просмотр, редактирование ограничено)
			// Никаких ограничений для просмотра - менеджер может видеть все заказы
			whereClause = { id: orderId };
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
				booking: {
					include: {
						client: {
							select: { id: true, first_name: true, last_name: true, phone: true },
						},
						manager: {
							select: { id: true, first_name: true, last_name: true, role: true, phone: true },
						},
						bookingDepartment: {
							select: { id: true, name: true, address: true, phones: true, emails: true },
						},
					},
				},
				bookingDepartment: {
					select: {
						id: true,
						name: true,
						address: true,
						phones: true,
						emails: true,
						createdAt: true,
						updatedAt: true,
					},
				},
				deliveryPickupPoint: {
					select: {
						id: true,
						name: true,
						address: true,
						phones: true,
						emails: true,
					},
				},
			},
		});

		if (!order) {
			return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
		}

		// Получаем дату присвоения текущего статуса из последнего лога изменения статуса
		const lastStatusChangeLog = await prisma.orderLog.findFirst({
			where: {
				orderId: order.id,
				action: "status_change",
			},
			select: {
				createdAt: true,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		const statusChangeDate = lastStatusChangeLog?.createdAt || null;

		const orderWithStatusDate = {
			...order,
			statusChangeDate,
		} as Order;

		const response: OrderResponse = {
			order: orderWithStatusDate,
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

		// Получаем текущий заказ для проверки доступа (позиции — для серверной валидации при смене статуса)
		const currentOrder = await prisma.order.findFirst({
			where: whereClause,
			include: { orderItems: true },
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

		if (targetManagerId != null && !responsibleUser) {
			responsibleUser = await prisma.user.findUnique({
				where: { id: targetManagerId },
				select: { id: true, role: true, departmentId: true },
			});
			if (!responsibleUser) {
				return NextResponse.json({ error: "Ответственный не найден" }, { status: 400 });
			}
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

		// Связь заказа с записью (booking): проверка до транзакции
		if (body.bookingId !== undefined && body.bookingId !== null) {
			const bookingRow = await prisma.booking.findUnique({
				where: { id: body.bookingId },
				select: { id: true },
			});
			if (!bookingRow) {
				return NextResponse.json({ error: "Запись с таким ID не найдена" }, { status: 400 });
			}
			const conflictOrder = await prisma.order.findFirst({
				where: { bookingId: body.bookingId, id: { not: orderId } },
				select: { id: true },
			});
			if (conflictOrder) {
				return NextResponse.json(
					{ error: `Эта запись уже привязана к заказу №${conflictOrder.id}` },
					{ status: 400 },
				);
			}
		}

		// Адрес доставки: нельзя одновременно отдел для записей и пункт выдачи
		const bdIn = body.bookingDepartmentId;
		const ppIn = body.deliveryPickupPointId;
		if (bdIn !== undefined && ppIn !== undefined && bdIn !== null && ppIn !== null) {
			return NextResponse.json(
				{ error: "Укажите либо адрес отдела записи, либо пункт выдачи, не оба сразу" },
				{ status: 400 },
			);
		}
		if (ppIn !== undefined && ppIn !== null) {
			const ppRow = await prisma.pickupPoint.findUnique({ where: { id: ppIn }, select: { id: true } });
			if (!ppRow) {
				return NextResponse.json({ error: "Пункт выдачи не найден" }, { status: 400 });
			}
		}
		if (bdIn !== undefined && bdIn !== null) {
			const bdRow = await prisma.bookingDepartment.findUnique({ where: { id: bdIn }, select: { id: true } });
			if (!bdRow) {
				return NextResponse.json({ error: "Адрес отдела записи не найден" }, { status: 400 });
			}
		}

		// Валидация цепочки полей при продвижении статуса вперёд (поля этапов не все хранятся в БД — полагаемся на тело запроса)
		if (body.status !== undefined) {
			const newIdx = statusTimeline.indexOf(body.status as (typeof statusTimeline)[number]);
			const isForward = newIdx !== -1 && newIdx > currentStatusIndex;
			if (isForward) {
				const effectiveManagerId = targetManagerId ?? null;
				const isSuperadminSelfResponsible = user.role === "superadmin" && effectiveManagerId === fullUser.id;
				const mergedDept =
					user.role === "superadmin" && effectiveManagerId === fullUser.id ? null : (targetDepartmentId ?? null);

				const mergedClientId = body.clientId !== undefined ? body.clientId : currentOrder.clientId ?? null;
				const mergedContactName = body.contactName !== undefined ? body.contactName : currentOrder.contactName;
				const mergedContactPhone = body.contactPhone !== undefined ? body.contactPhone : currentOrder.contactPhone;
				const mergedFinal =
					body.finalDeliveryDate !== undefined ? body.finalDeliveryDate : currentOrder.finalDeliveryDate;
				const mergedBookingId = body.bookingId !== undefined ? body.bookingId : currentOrder.bookingId;
				const mergedBd = body.bookingDepartmentId !== undefined ? body.bookingDepartmentId : currentOrder.bookingDepartmentId;
				const mergedPp = body.deliveryPickupPointId !== undefined ? body.deliveryPickupPointId : currentOrder.deliveryPickupPointId;

				const mergedItems =
					body.orderItems !== undefined
						? body.orderItems.map((item) => ({
								product_sku: item.product_sku,
								supplierDeliveryDate: item.supplierDeliveryDate,
								carModel: item.carModel,
								vinCode: item.vinCode,
							}))
						: currentOrder.orderItems.map((item) => ({
								product_sku: item.product_sku,
								supplierDeliveryDate: item.supplierDeliveryDate,
								carModel: item.carModel,
								vinCode: item.vinCode,
							}));

				const statusIssues = validateOrderMergedStateForStatus({
					targetStatus: body.status as OrderStatus,
					isSuperadminSelfResponsible,
					clientId: mergedClientId,
					contactName: mergedContactName,
					contactPhone: mergedContactPhone,
					departmentId: mergedDept,
					managerId: effectiveManagerId,
					managerDepartmentId: responsibleUser?.departmentId ?? null,
					orderItems: mergedItems,
					finalDeliveryDate: mergedFinal,
					bookingId: mergedBookingId,
					bookingDepartmentId: mergedBd,
					deliveryPickupPointId: mergedPp,
					bookedUntil: body.bookedUntil,
					readyUntil: body.readyUntil,
					prepaymentAmount: body.prepaymentAmount,
					prepaymentDate: body.prepaymentDate,
					paymentDate: body.paymentDate,
					orderAmount: body.orderAmount,
					completionDate: body.completionDate,
					returnReason: body.returnReason,
					returnDate: body.returnDate,
					returnAmount: body.returnAmount,
					returnPaymentDate: body.returnPaymentDate,
					returnDocumentNumber: body.returnDocumentNumber,
				});

				if (statusIssues.length > 0) {
					return NextResponse.json({ error: statusIssues.map((i) => i.message).join(" ") }, { status: 400 });
				}
			}
		}

		// Сохраняем снапшот заказа ДО изменений для улучшенного логирования
		const orderSnapshotBefore = await getFullOrderSnapshot(orderId);

		// Менеджер не может перезаписывать состав заказа после фактического подтверждения в БД
		const orderItemsPayload = body.orderItems;
		const applyOrderItemsUpdate =
			orderItemsPayload !== undefined && !(user.role === "manager" && currentStatusIndex > 0);

		// Обновляем заказ в транзакции
		const updatedOrder = await prisma.$transaction(async (tx) => {
			// Подготавливаем данные для обновления
			const updateData: any = {};

			if (body.comments !== undefined) {
				updateData.comments = mergeOrderCommentsOnUpdate(currentOrder.comments, body.comments, user.role, fullUser);
			}
			if (body.contactName !== undefined) updateData.contactName = body.contactName?.trim() || null;
			if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone?.trim() || null;
			if (body.clientId !== undefined) {
				updateData.clientId = body.clientId;
			}
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

			// Обновляем связь с заявкой
			if (body.bookingId !== undefined) {
				updateData.bookingId = body.bookingId;
			}

			// Адрес доставки: отдел для записей и пункт выдачи взаимоисключающие
			if (body.bookingDepartmentId !== undefined) {
				updateData.bookingDepartmentId = body.bookingDepartmentId;
				if (body.bookingDepartmentId !== null) {
					updateData.deliveryPickupPointId = null;
				}
			}
			if (body.deliveryPickupPointId !== undefined) {
				updateData.deliveryPickupPointId = body.deliveryPickupPointId;
				if (body.deliveryPickupPointId !== null) {
					updateData.bookingDepartmentId = null;
				}
			}

			// Синхронизация booking.order_id с полем order.booking_id (дублирующая колонка в БД)
			if (body.bookingId !== undefined) {
				const newBookingId = body.bookingId;
				const oldBookingId = currentOrder.bookingId ?? null;
				if (oldBookingId !== null && oldBookingId !== newBookingId) {
					await tx.booking.update({
						where: { id: oldBookingId },
						data: { orderId: null },
					});
				}
			}

			// Обновляем товары заказа, если они были переданы (и роль это допускает)
			// Сначала удаляем все старые товары, затем создаем новые
			if (applyOrderItemsUpdate && orderItemsPayload) {
				// Удаляем все старые позиции заказа
				await tx.orderItem.deleteMany({
					where: { orderId: orderId },
				});

				// Создаем новые позиции заказа с обновленными данными
				if (orderItemsPayload.length > 0) {
					await tx.orderItem.createMany({
						data: orderItemsPayload.map((item) => ({
							orderId: orderId,
							product_sku: item.product_sku,
							product_title: item.product_title,
							product_price: item.product_price,
							product_brand: item.product_brand,
							product_image: item.product_image || null,
							quantity: item.quantity,
							supplierDeliveryDate: item.supplierDeliveryDate ? new Date(item.supplierDeliveryDate) : null,
							carModel: item.carModel || null,
							vinCode: item.vinCode || null,
						})),
					});
				}
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
					booking: {
						include: {
							client: {
								select: { id: true, first_name: true, last_name: true, phone: true },
							},
							manager: {
								select: { id: true, first_name: true, last_name: true, role: true, phone: true },
							},
							bookingDepartment: {
								select: { id: true, name: true, address: true, phones: true, emails: true },
							},
						},
					},
					bookingDepartment: { select: { id: true, name: true, address: true, phones: true, emails: true, createdAt: true, updatedAt: true } },
					deliveryPickupPoint: { select: { id: true, name: true, address: true, phones: true, emails: true } },
				},
			});

			// Дублирующее поле booking.order_id — для экрана записи и логов
			if (body.bookingId !== undefined && body.bookingId !== null) {
				await tx.booking.update({
					where: { id: body.bookingId },
					data: { orderId: orderId },
				});
			}

			// Лог: action — для фильтров; message — человекочитаемое «было → стало»
			let action = "update";
			if (body.status && body.status !== currentOrder.status) {
				action = "status_change";
			}
			if (body.managerId !== undefined && body.managerId !== currentOrder.managerId) {
				action = body.managerId === null ? "unassign" : "assign";
			}

			const orderAfterForDiff = {
				status: order.status,
				clientId: order.clientId,
				managerId: order.managerId,
				departmentId: order.departmentId,
				contactName: order.contactName,
				contactPhone: order.contactPhone,
				finalDeliveryDate: order.finalDeliveryDate,
				bookingId: order.bookingId,
				bookingDepartmentId: order.bookingDepartmentId,
				deliveryPickupPointId: order.deliveryPickupPointId,
				comments: order.comments,
				orderItems: order.orderItems,
				client: order.client,
				manager: order.manager,
				department: order.department,
				bookingDepartment: order.bookingDepartment,
				deliveryPickupPoint: order.deliveryPickupPoint,
			};
			const message = buildOrderUpdateMessage(orderSnapshotBefore, orderAfterForDiff);

			// Получаем полный снапшот заказа ПОСЛЕ изменений
			const orderSnapshotAfter = {
				id: order.id,
				status: order.status,
				managerId: order.managerId,
				departmentId: order.departmentId,
				clientId: order.clientId,
				confirmationDate: (order as any).confirmationDate ?? null,
				finalDeliveryDate: (order as any).finalDeliveryDate ?? null,
				bookingId: order.bookingId,
				bookingDepartmentId: (order as any).bookingDepartmentId ?? null,
				deliveryPickupPointId: (order as any).deliveryPickupPointId ?? null,
			};

			// Подготавливаем снапшот менеджера (если назначен)
			let managerSnapshot = null;
			if (order.manager) {
				managerSnapshot = {
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
				};
			}

			// Снапшот адреса доставки: отдел для записей или пункт выдачи
			let departmentSnapshot = null;
			if (order.bookingDepartment) {
				departmentSnapshot = {
					id: order.bookingDepartment.id,
					name: order.bookingDepartment.name,
					address: order.bookingDepartment.address,
					phones: order.bookingDepartment.phones,
					emails: order.bookingDepartment.emails,
				};
			} else if ((order as any).deliveryPickupPoint) {
				const pp = (order as any).deliveryPickupPoint;
				departmentSnapshot = {
					id: pp.id,
					name: pp.name,
					address: pp.address,
					phones: pp.phones,
					emails: pp.emails,
				};
			}

			// Создаём лог с полными снапшотами
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
					orderSnapshot: orderSnapshotAfter,
					managerSnapshot: managerSnapshot ?? Prisma.JsonNull,
					departmentSnapshot: departmentSnapshot ?? Prisma.JsonNull,
				},
			});

			// Также логируем в общую таблицу ChangeLog для универсальности
			await tx.changeLog.create({
				data: {
					entityType: "order",
					message,
					entityId: orderId,
					adminId: fullUser.id,
					departmentId: fullUser.departmentId,
					snapshotBefore: orderSnapshotBefore as any, // Снапшот до изменений
					snapshotAfter: {
						...orderSnapshotAfter,
						orderItems: order.orderItems,
						manager: order.manager,
						department: order.department,
						client: order.client,
						creator: order.creator,
						booking: order.booking,
						bookingDepartment: order.bookingDepartment,
						deliveryPickupPoint: (order as any).deliveryPickupPoint ?? null,
					} as any,
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
					} as any,
				},
			});

			return order;
		});

		const orderOut = updatedOrder as Order;

		const response: OrderResponse = {
			order: orderOut,
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
