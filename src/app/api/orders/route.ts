export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { OrderResponse, CreateOrderRequest } from "@/lib/types";
import { withDbRetry } from "@/lib/utils";

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
		const dateFrom = searchParams.get("dateFrom");
		const dateTo = searchParams.get("dateTo");
		const statusDateFrom = searchParams.get("statusDateFrom");
		const statusDateTo = searchParams.get("statusDateTo");
		const deliveryDateFrom = searchParams.get("deliveryDateFrom");
		const deliveryDateTo = searchParams.get("deliveryDateTo");
		const idSearch = searchParams.get("idSearch"); // Поиск по ID заказа

		// Получаем полную информацию о пользователе из базы данных
		// Обёртываем в withDbRetry для обработки ошибок соединения
		const fullUser = await withDbRetry(async () => {
			return await prisma.user.findUnique({
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
			// Менеджер видит все заказы (только просмотр, редактирование ограничено)
			// Никаких ограничений для просмотра - менеджер может видеть все заказы
			// Ограничения на редактирование применяются в API обновления заказа
		}

		// Добавляем дополнительные фильтры
		if (status) {
			whereClause.status = status;
		}
		if (managerId) {
			whereClause.managerId = parseInt(managerId);
		}
		if (departmentId) {
			whereClause.departmentId = departmentId === "null" ? null : parseInt(departmentId);
		}
		if (clientId) {
			whereClause.clientId = parseInt(clientId);
		}
		// Поиск по ID заказа
		if (idSearch) {
			const orderId = parseInt(idSearch);
			if (!isNaN(orderId)) {
				whereClause.id = orderId;
			}
		}
		// Фильтр по дате создания заказа
		if (dateFrom || dateTo) {
			whereClause.createdAt = {};
			if (dateFrom) {
				whereClause.createdAt.gte = new Date(dateFrom);
			}
			if (dateTo) {
				whereClause.createdAt.lte = new Date(dateTo);
			}
		}
		// Фильтр по дате доставки клиенту
		if (deliveryDateFrom || deliveryDateTo) {
			whereClause.finalDeliveryDate = {};
			if (deliveryDateFrom) {
				whereClause.finalDeliveryDate.gte = new Date(deliveryDateFrom);
			}
			if (deliveryDateTo) {
				whereClause.finalDeliveryDate.lte = new Date(deliveryDateTo);
			}
		}

		// Получаем заказы с пагинацией
		// Middleware автоматически обрабатывает ошибки соединения, поэтому не нужен withDbRetry
		// Это ускоряет запросы, так как не делаем лишние попытки

		// Если есть фильтр по дате присвоения статуса, сначала находим ID заказов по логам
		let orderIdsByStatusDate: number[] | null = null;
		if (statusDateFrom || statusDateTo) {
			const statusDateWhere: any = {
				action: "status_change",
			};
			if (statusDateFrom || statusDateTo) {
				statusDateWhere.createdAt = {};
				if (statusDateFrom) {
					statusDateWhere.createdAt.gte = new Date(statusDateFrom);
				}
				if (statusDateTo) {
					statusDateWhere.createdAt.lte = new Date(statusDateTo);
				}
			}

			const statusChangeLogs = await prisma.orderLog.findMany({
				where: statusDateWhere,
				select: {
					orderId: true,
				},
				distinct: ["orderId"],
			});

			orderIdsByStatusDate = statusChangeLogs.map((log) => log.orderId);

			// Если нет заказов с изменением статуса в указанном диапазоне, возвращаем пустой список
			if (orderIdsByStatusDate.length === 0) {
				return NextResponse.json({
					orders: [],
					total: 0,
					page,
					limit,
					totalPages: 0,
				});
			}

			// Добавляем фильтр по ID заказов к основному условию
			if (!whereClause.id) {
				whereClause.id = { in: orderIdsByStatusDate };
			} else {
				// Если уже есть фильтр по ID (маловероятно), объединяем через AND
				const existingIdFilter = whereClause.id;
				delete whereClause.id;
				whereClause.AND = [{ id: existingIdFilter }, { id: { in: orderIdsByStatusDate } }];
			}
		}

		// Выполняем запросы параллельно для ускорения
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const [list, cnt] = await withDbRetry(async () => {
			return await Promise.all([
				prisma.order.findMany({
					where: whereClause,
					include: {
						manager: {
							select: { id: true, first_name: true, last_name: true, role: true, department: { select: { id: true, name: true } } },
						},
						department: { select: { id: true, name: true } },
						client: { select: { id: true, first_name: true, last_name: true, phone: true } },
						creator: { select: { id: true, first_name: true, last_name: true, role: true, department: { select: { id: true, name: true } } } },
						orderItems: true,
						booking: {
							select: {
								id: true,
								scheduledDate: true,
								scheduledTime: true,
								status: true,
								contactPhone: true,
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
						technicalService: {
							select: {
								id: true,
								number: true,
								responsibleUserId: true,
								createdAt: true,
								updatedAt: true,
								responsibleUser: {
									select: { id: true, first_name: true, last_name: true, role: true },
								},
							},
						},
					},
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				prisma.order.count({ where: whereClause }),
			]);
		});

		// Получаем даты последнего изменения статуса для каждого заказа
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const orderIds = list.map((o) => o.id);
		const lastStatusChangeLogs = await withDbRetry(async () => {
			return await prisma.orderLog.findMany({
				where: {
					orderId: { in: orderIds },
					action: "status_change",
				},
				select: {
					orderId: true,
					createdAt: true,
				},
				orderBy: {
					createdAt: "desc",
				},
			});
		});

		// Создаём Map для быстрого поиска последней даты изменения статуса
		const statusChangeMap = new Map<number, Date>();
		lastStatusChangeLogs.forEach((log) => {
			if (!statusChangeMap.has(log.orderId)) {
				statusChangeMap.set(log.orderId, log.createdAt);
			}
		});

		// Добавляем дату последнего изменения статуса к каждому заказу
		const orders = list.map((order) => {
			const statusChangeDate = statusChangeMap.get(order.id) || null;
			return {
				...order,
				statusChangeDate,
			};
		});

		const total = cnt;

		const totalPages = Math.ceil(total / limit);

		const response: OrderResponse = {
			orders,
			total,
			page,
			totalPages,
		};

		return NextResponse.json(response);
	} catch (error: any) {
		console.error("Error fetching orders:", error);

		// Если это ошибка соединения с БД, возвращаем пустой список вместо ошибки
		// Это позволяет пользователю видеть интерфейс, даже если БД временно недоступна
		const errorCode = error?.code || error?.meta?.code || "";
		const message = String(error?.message || "").toLowerCase();

		const isConnectionError =
			errorCode === "P1017" ||
			errorCode === "P2024" ||
			message.includes("server has closed the connection") ||
			message.includes("удаленный хост принудительно разорвал") ||
			message.includes("connection pool");

		if (isConnectionError) {
			// Возвращаем пустой список при ошибке соединения
			// Пользователь может попробовать обновить страницу позже
			return NextResponse.json({
				orders: [],
				total: 0,
				page: 1,
				totalPages: 0,
			});
		}

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

		// ── Подготавливаем данные для отдела и ответственного ──
		// Здесь и дальше отдел и ответственный валидируем вручную по правилам заказчика.
		let departmentId = body.departmentId;
		const requestedManagerId = body.managerId ?? null;
		let resolvedManagerId: number | null = null;

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

		// ── Коррекция отдела с учётом роли автора ──
		if (user.role === "superadmin") {
			// Суперадмин может указать любой отдел вручную (приоритетно).
			if (body.departmentId) {
				departmentId = body.departmentId;
			}
		} else if (user.role === "admin") {
			// Админ обязан работать внутри своего отдела.
			if (!fullUser.departmentId) {
				return NextResponse.json({ error: "Администратор без отдела не может создать заказ" }, { status: 400 });
			}
			departmentId = fullUser.departmentId;
		} else if (user.role === "manager") {
			// Менеджер тоже должен работать внутри своего отдела.
			if (!fullUser.departmentId) {
				return NextResponse.json({ error: "Менеджер без отдела не может создать заказ" }, { status: 400 });
			}
			departmentId = fullUser.departmentId;
		}

		// ── Определяем ответственного ──
		// Для менеджера заказчика правило: он автоматически становится ответственным.
		if (user.role === "manager") {
			resolvedManagerId = fullUser.id;
		} else if (user.role === "admin") {
			// Админ может назначить себя или менеджеров своего отдела.
			if (requestedManagerId) {
				resolvedManagerId = requestedManagerId;
			} else {
				// Явно не назначаем никого: заказ может остаться свободным, если админ так решил.
				resolvedManagerId = null;
			}
		} else {
			// Для суперадмина и остальных ролей ответственным становится тот, кто пришёл в теле запроса.
			resolvedManagerId = requestedManagerId;
		}

		let responsibleUser: {
			id: number;
			role: string;
			departmentId: number | null;
		} | null = null;

		if (resolvedManagerId !== null) {
			responsibleUser = await prisma.user.findUnique({
				where: { id: resolvedManagerId },
				select: {
					id: true,
					role: true,
					departmentId: true,
				},
			});

			if (!responsibleUser) {
				return NextResponse.json({ error: "Указан несуществующий ответственный" }, { status: 400 });
			}

			// Менеджером/админом без отдела быть нельзя (по требованиям).
			if (["admin", "manager"].includes(responsibleUser.role) && !responsibleUser.departmentId) {
				return NextResponse.json({ error: "Ответственный без отдела не может быть назначен на заказ" }, { status: 400 });
			}

			// Админ может назначить только себя или менеджеров своего отдела.
			if (user.role === "admin") {
				if (responsibleUser.role === "admin" && responsibleUser.id !== fullUser.id) {
					return NextResponse.json({ error: "Админ может назначить ответственным только себя" }, { status: 400 });
				}
				if (responsibleUser.departmentId !== fullUser.departmentId) {
					return NextResponse.json({ error: "Можно назначать только сотрудников своего отдела" }, { status: 400 });
				}
			}

			// Суперадмин может назначить себя или сотрудников выбранного отдела.
			if (user.role === "superadmin") {
				const isSelf = responsibleUser.id === fullUser.id;
				if (!isSelf) {
					if (!["admin", "manager"].includes(responsibleUser.role)) {
						return NextResponse.json({ error: "Ответственным может быть только админ или менеджер" }, { status: 400 });
					}
					if (!departmentId || responsibleUser.departmentId !== departmentId) {
						return NextResponse.json({ error: "Ответственный должен принадлежать указанному отделу" }, { status: 400 });
					}
				}
			}

			// Менеджеру назначаем только самого себя (пользовательская логика выше).
			if (user.role === "manager" && responsibleUser.id !== fullUser.id) {
				return NextResponse.json({ error: "Менеджер может создавать заявки только на себя" }, { status: 400 });
			}

			// Если отдел заказа известен, то ответственный должен принадлежать этому отделу (кроме случая супер-админа, который назначает себя).
			if (departmentId && responsibleUser.departmentId && responsibleUser.id !== fullUser.id && responsibleUser.departmentId !== departmentId) {
				return NextResponse.json({ error: "Ответственный должен принадлежать отделу заказа" }, { status: 400 });
			}
		}

		// Для менеджера заявка всегда закрепляется на нём. Если контроль выше не позволил выбрать ответственного, сбрасываем на null.
		if (user.role === "manager") {
			resolvedManagerId = responsibleUser?.id ?? fullUser.id;
		}

		const isSuperadminSelf = user.role === "superadmin" && resolvedManagerId === fullUser.id;

		if (isSuperadminSelf) {
			departmentId = undefined;
		}

		// Если отдел указан (или вычислен) - убедимся, что он существует.
		if (departmentId !== undefined && departmentId !== null) {
			const existingDepartment = await prisma.department.findUnique({
				where: { id: departmentId },
				select: { id: true },
			});

			if (!existingDepartment) {
				return NextResponse.json({ error: "Указан несуществующий отдел" }, { status: 400 });
			}
		}

		let finalDeliveryDate: Date | null = null;
		if (body.finalDeliveryDate) {
			const parsedFinalDelivery = new Date(body.finalDeliveryDate);
			if (isNaN(parsedFinalDelivery.getTime())) {
				return NextResponse.json({ error: "Некорректная дата финальной поставки клиенту" }, { status: 400 });
			}
			finalDeliveryDate = parsedFinalDelivery;
		}

		const status = body.status ?? "created";
		const confirmationDate = status === "confirmed" ? new Date() : null;

		// Собираем данные для создания заказа
		const orderDataToCreate: any = {
			comments: [],
			status,
			clientId: body.clientId || null,
			managerId: resolvedManagerId,
			departmentId: departmentId ?? null,
			createdBy: fullUser.id,
			finalDeliveryDate,
			confirmationDate,
			bookingId: body.bookingId ?? null, // Связь с заявкой
			bookingDepartmentId: body.bookingDepartmentId ?? null, // Адрес доставки
			// Поле assignedAt остается null для свободных заказов
		};

		// Создаем заказ в транзакции
		const order = await prisma.$transaction(async (tx) => {
			// Создаем заказ
			const newOrder = await tx.order.create({
				data: orderDataToCreate,
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
					supplierDeliveryDate: item.supplierDeliveryDate ? new Date(item.supplierDeliveryDate) : null,
					carModel: item.carModel || null,
					vinCode: item.vinCode || null,
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
						confirmationDate: (newOrder as any).confirmationDate ?? null,
						finalDeliveryDate: (newOrder as any).finalDeliveryDate ?? null,
					},
				},
			});

			// Создаем лог присвоения начального статуса для отслеживания даты присвоения текущего статуса
			await tx.orderLog.create({
				data: {
					action: "status_change",
					message: `Заказ создан со статусом "${newOrder.status}"`,
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
						confirmationDate: (newOrder as any).confirmationDate ?? null,
						finalDeliveryDate: (newOrder as any).finalDeliveryDate ?? null,
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
