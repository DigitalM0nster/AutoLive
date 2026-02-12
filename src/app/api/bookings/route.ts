// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import {
	CreateBookingRequest,
	BookingResponse,
	BookingFilter,
	ManagerSnapshotForBookingLog,
	AdminSnapshotForBookingLog,
	BookingDepartmentSnapshotForLog,
	BookingSnapshotForLog,
} from "@/lib/types";
import { withDbRetry } from "@/lib/utils";

// GET /api/bookings - Получить список записей
async function getBookingsHandler(req: NextRequest, { user, scope }: { user: any; scope: any }) {
	try {
		// Получаем параметры из URL
		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const status = searchParams.get("status");
		const managerId = searchParams.get("managerId");
		const clientId = searchParams.get("clientId");
		const bookingDepartmentId = searchParams.get("bookingDepartmentId");
		const dateFrom = searchParams.get("dateFrom");
		const dateTo = searchParams.get("dateTo");
		const phoneSearch = searchParams.get("phoneSearch");
		const idSearch = searchParams.get("idSearch"); // Поиск по ID заявки

		// Строим фильтры
		const where: any = {};

		// Поиск по ID заявки
		if (idSearch) {
			const bookingId = parseInt(idSearch);
			if (!isNaN(bookingId)) {
				where.id = bookingId;
			}
		}

		if (status) {
			where.status = status;
		}

		if (managerId && managerId !== "null") {
			where.managerId = parseInt(managerId);
		}

		if (clientId && clientId !== "null") {
			where.clientId = parseInt(clientId);
		}

		if (bookingDepartmentId && bookingDepartmentId !== "null") {
			where.bookingDepartmentId = parseInt(bookingDepartmentId);
		}

		if (dateFrom) {
			where.scheduledDate = {
				...where.scheduledDate,
				gte: new Date(dateFrom),
			};
		}

		if (dateTo) {
			where.scheduledDate = {
				...where.scheduledDate,
				lte: new Date(dateTo),
			};
		}

		// Подсчитываем общее количество записей (будет пересчитано после фильтрации по телефону, если нужно)
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		// const total = await withDbRetry(async () => {
		// 	return await prisma.booking.count({ where });
		// });

		// Получаем записи с пагинацией
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		let bookings = await withDbRetry(async () => {
			return await prisma.booking.findMany({
				where,
				include: {
					client: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							phone: true,
						},
					},
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
				},
				orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
			});
		});

		// Фильтруем по телефону, если указан поиск
		if (phoneSearch && phoneSearch.trim() !== "") {
			const phoneSearchLower = phoneSearch.toLowerCase().trim();
			bookings = bookings.filter((booking) => {
				// Поиск по полю contactPhone
				if (booking.contactPhone && booking.contactPhone.toLowerCase().includes(phoneSearchLower)) {
					return true;
				}
				return false;
			});
		}

		// Подсчитываем общее количество после фильтрации
		const total = bookings.length;

		// Применяем пагинацию
		const paginatedBookings = bookings.slice((page - 1) * limit, page * limit);

		const totalPages = Math.ceil(total / limit);

		const response: BookingResponse = {
			bookings: paginatedBookings,
			total,
			page,
			totalPages,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Ошибка при получении записей:", error);
		return NextResponse.json({ error: "Ошибка при получении записей" }, { status: 500 });
	}
}

// POST /api/bookings - Создать новую запись
async function createBookingHandler(req: NextRequest, { user }: { user: any }) {
	try {
		// Парсим тело запроса с обработкой ошибок
		let body: CreateBookingRequest;
		try {
			body = await req.json();
		} catch (parseError) {
			console.error("Ошибка парсинга JSON:", parseError);
			return NextResponse.json({ error: "Некорректный формат данных запроса" }, { status: 400 });
		}

		// Логируем входящие данные для отладки
		console.log("Создание записи. Входящие данные:", JSON.stringify(body, null, 2));

		// Валидация обязательных полей
		if (!body.scheduledDate || !body.scheduledTime) {
			return NextResponse.json({ error: "Обязательные поля: scheduledDate, scheduledTime" }, { status: 400 });
		}

		if (!body.bookingDepartmentId || body.bookingDepartmentId === 0) {
			return NextResponse.json({ error: "Необходимо выбрать отдел для записи" }, { status: 400 });
		}

		// Проверяем формат даты
		const scheduledDate = new Date(body.scheduledDate);
		if (isNaN(scheduledDate.getTime())) {
			return NextResponse.json({ error: "Некорректный формат даты" }, { status: 400 });
		}

		// Проверяем формат времени (должно быть в формате "HH:MM")
		const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
		if (!timeRegex.test(body.scheduledTime)) {
			return NextResponse.json({ error: "Некорректный формат времени. Используйте формат HH:MM (например, 14:30)" }, { status: 400 });
		}

		// Получаем полную информацию о пользователе из базы данных
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
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Проверяем, что отдел для записей существует
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const bookingDepartment = await withDbRetry(async () => {
			return await prisma.bookingDepartment.findUnique({
				where: { id: body.bookingDepartmentId },
			});
		});

		if (!bookingDepartment) {
			return NextResponse.json({ error: "Отдел для записей не найден" }, { status: 404 });
		}

		// Если указан managerId, проверяем что менеджер существует
		if (body.managerId !== null && body.managerId !== undefined && body.managerId !== 0) {
			const manager = await withDbRetry(async () => {
				return await prisma.user.findUnique({
					where: { id: body.managerId as number },
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

			if (!manager) {
				return NextResponse.json({ error: "Менеджер не найден" }, { status: 404 });
			}
		}

		// Валидация телефона для связи
		if (!body.contactPhone || body.contactPhone.trim() === "") {
			return NextResponse.json({ error: "Телефон для связи обязателен" }, { status: 400 });
		}

		// Обрабатываем клиента: либо используем существующий clientId, либо сохраняем данные незарегистрированного клиента
		let finalClientId: number | null = null;
		let guestClientName: string | undefined = undefined;
		let finalContactPhone: string = body.contactPhone.trim();

		if (body.clientId !== null && body.clientId !== undefined && body.clientId !== 0) {
			// Если указан clientId, проверяем что клиент существует
			const client = await withDbRetry(async () => {
				return await prisma.user.findUnique({
					where: { id: body.clientId as number },
				});
			});

			if (!client) {
				return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
			}

			finalClientId = body.clientId as number;
			// Если клиент выбран, используем его телефон из профиля (если он указан в contactPhone, иначе берем из профиля)
			if (!finalContactPhone && client.phone) {
				finalContactPhone = client.phone;
			}
		} else if (body.clientName) {
			// Если clientId не указан, но указано имя - это незарегистрированный клиент
			// Сохраняем имя в notes для удобства менеджера
			guestClientName = body.clientName;
		}

		// Создаем запись в транзакции
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const booking = await withDbRetry(async () => {
			return await prisma.$transaction(async (tx) => {
				try {
					// Создаем запись
					// Преобразуем clientId и managerId: если они 0, null или undefined, то null
					const managerId = body.managerId && body.managerId !== 0 ? body.managerId : null;

					// Формируем notes: добавляем имя незарегистрированного клиента, если оно есть
					let bookingNotes = body.notes || "";

					// Если есть имя незарегистрированного клиента, добавляем его в notes
					if (guestClientName) {
						const guestInfoLines: string[] = [];
						guestInfoLines.push("--- Данные незарегистрированного клиента ---");
						guestInfoLines.push(`Имя: ${guestClientName}`);
						guestInfoLines.push("---");

						// Добавляем к существующим notes, если они есть
						if (bookingNotes) {
							bookingNotes = `${bookingNotes}\n\n${guestInfoLines.join("\n")}`;
						} else {
							bookingNotes = guestInfoLines.join("\n");
						}
					}

					const newBooking = await tx.booking.create({
						data: {
							scheduledDate: scheduledDate,
							scheduledTime: body.scheduledTime,
							contactPhone: finalContactPhone, // Телефон для связи (обязательное поле)
							clientId: finalClientId, // null для незарегистрированных клиентов
							managerId: managerId,
							bookingDepartmentId: body.bookingDepartmentId,
							orderId: body.orderId ?? null, // Связь с заказом
							notes: bookingNotes || null,
						},
						include: {
							client: {
								select: {
									id: true,
									first_name: true,
									last_name: true,
									phone: true,
								},
							},
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
							order: {
								select: {
									id: true,
									status: true,
									createdAt: true,
								},
							},
						},
					});

					// Получаем менеджера для снапшота (если назначен)
					let managerSnapshot: ManagerSnapshotForBookingLog | undefined = undefined;
					if (newBooking.managerId) {
						const managerForSnapshot = await tx.user.findUnique({
							where: { id: newBooking.managerId },
							include: {
								department: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						});

						if (managerForSnapshot) {
							managerSnapshot = {
								id: managerForSnapshot.id,
								first_name: managerForSnapshot.first_name,
								last_name: managerForSnapshot.last_name,
								role: managerForSnapshot.role,
								department: managerForSnapshot.department
									? {
											id: managerForSnapshot.department.id,
											name: managerForSnapshot.department.name,
									  }
									: null,
							};
						}
					}

					// Подготавливаем данные для лога
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

					const bookingSnapshot: BookingSnapshotForLog = {
						id: newBooking.id,
						scheduledDate: newBooking.scheduledDate,
						scheduledTime: newBooking.scheduledTime,
						contactPhone: newBooking.contactPhone,
						status: newBooking.status,
						managerId: newBooking.managerId,
						clientId: newBooking.clientId,
						bookingDepartmentId: newBooking.bookingDepartmentId,
						notes: newBooking.notes,
					};

					const departmentSnapshot: BookingDepartmentSnapshotForLog = {
						id: bookingDepartment.id,
						name: bookingDepartment.name,
						address: bookingDepartment.address,
						phones: bookingDepartment.phones,
						emails: bookingDepartment.emails,
					};

					// Подготавливаем данные для лога создания
					const logData: {
						action: string;
						message: string;
						bookingId: number;
						adminSnapshot: AdminSnapshotForBookingLog;
						bookingSnapshot: BookingSnapshotForLog;
						managerSnapshot?: ManagerSnapshotForBookingLog;
						departmentSnapshot: BookingDepartmentSnapshotForLog;
					} = {
						action: "create",
						message: `Запись создана`,
						bookingId: newBooking.id,
						adminSnapshot,
						bookingSnapshot,
						departmentSnapshot,
					};

					// Добавляем managerSnapshot только если менеджер назначен
					if (managerSnapshot !== undefined) {
						logData.managerSnapshot = managerSnapshot;
					}

					// Создаем лог создания записи
					await tx.bookingLog.create({
						data: logData,
					});

					// Создаем лог присвоения начального статуса
					const statusLogData: {
						action: string;
						message: string;
						bookingId: number;
						adminSnapshot: AdminSnapshotForBookingLog;
						bookingSnapshot: BookingSnapshotForLog;
						managerSnapshot?: ManagerSnapshotForBookingLog;
						departmentSnapshot: BookingDepartmentSnapshotForLog;
					} = {
						action: "status_change",
						message: `Запись создана со статусом "${newBooking.status}"`,
						bookingId: newBooking.id,
						adminSnapshot,
						bookingSnapshot,
						departmentSnapshot,
					};

					// Добавляем managerSnapshot только если менеджер назначен
					if (managerSnapshot !== undefined) {
						statusLogData.managerSnapshot = managerSnapshot;
					}

					await tx.bookingLog.create({
						data: statusLogData,
					});

					// Также логируем в общую таблицу ChangeLog для универсальности
					await tx.changeLog.create({
						data: {
							entityType: "booking",
							message: `Запись создана`,
							entityId: newBooking.id,
							adminId: fullUser.id,
							departmentId: fullUser.departmentId,
							snapshotBefore: Prisma.JsonNull, // При создании нет данных "до"
							snapshotAfter: {
								...bookingSnapshot,
								bookingDepartment: departmentSnapshot,
								manager: managerSnapshot || null,
							} as any,
							adminSnapshot: adminSnapshot as any,
						},
					});

					return newBooking;
				} catch (txError: any) {
					console.error("Ошибка в транзакции создания записи:", txError);
					// Пробрасываем ошибку дальше, чтобы транзакция откатилась
					throw txError;
				}
			});
		});

		// Получаем полную информацию о созданной записи с включением bookingDepartment
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const bookingWithDepartment = await withDbRetry(async () => {
			return await prisma.booking.findUnique({
				where: { id: booking.id },
				include: {
					client: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							phone: true,
						},
					},
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
				},
			});
		});

		if (!bookingWithDepartment) {
			console.error("Запись была создана, но не найдена при повторном запросе. ID записи:", booking.id);
			return NextResponse.json({ error: "Запись была создана, но произошла ошибка при получении данных" }, { status: 500 });
		}

		const response: BookingResponse = {
			booking: bookingWithDepartment,
		};

		return NextResponse.json(response, { status: 201 });
	} catch (error: any) {
		console.error("Ошибка при создании записи:", error);
		console.error("Детали ошибки:", {
			message: error?.message,
			code: error?.code,
			meta: error?.meta,
			stack: error?.stack,
		});

		// Обрабатываем различные типы ошибок Prisma
		if (error?.code === "P2002") {
			// Нарушение уникальности
			const field = error?.meta?.target?.[0] || "поле";
			return NextResponse.json({ error: `Запись с таким ${field} уже существует` }, { status: 409 });
		}

		if (error?.code === "P2003") {
			// Нарушение внешнего ключа
			return NextResponse.json({ error: "Связанная запись не найдена. Проверьте корректность данных." }, { status: 400 });
		}

		if (error?.code === "P2025") {
			// Запись не найдена
			return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
		}

		// Если это ошибка валидации Prisma, возвращаем более понятное сообщение
		if (error?.message && error.message.includes("Invalid")) {
			return NextResponse.json({ error: "Некорректные данные. Проверьте правильность заполнения всех полей." }, { status: 400 });
		}

		// Возвращаем более детальную информацию об ошибке
		// В продакшене можно скрыть детали, но для отладки оставляем
		const errorMessage =
			process.env.NODE_ENV === "production"
				? "Ошибка при создании записи. Попробуйте позже или обратитесь к администратору."
				: error?.message || "Ошибка при создании записи";
		const statusCode = error?.status || 500;
		return NextResponse.json({ error: errorMessage }, { status: statusCode });
	}
}

// Экспорт с проверкой разрешений
export const GET = withPermission(getBookingsHandler, "view_bookings", ["superadmin", "admin", "manager"]);
export const POST = withPermission(createBookingHandler, "manage_bookings", ["superadmin", "admin"]);
