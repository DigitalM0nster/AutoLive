// src/app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import {
	UpdateBookingRequest,
	BookingResponse,
	ManagerSnapshotForBookingLog,
	AdminSnapshotForBookingLog,
	BookingDepartmentSnapshotForLog,
	BookingSnapshotForLog,
} from "@/lib/types";
import { withDbRetry } from "@/lib/utils";

// GET /api/bookings/[id] - Получить запись по ID
async function getBookingHandler(req: NextRequest, { user, scope, params }: { user: any; scope: any; params: { id: string } }) {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID записи" }, { status: 400 });
		}

		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const booking = await withDbRetry(async () => {
			return await prisma.booking.findUnique({
				where: { id },
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
		});

		if (!booking) {
			return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
		}

		const response: BookingResponse = {
			booking,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Ошибка при получении записи:", error);
		return NextResponse.json({ error: "Ошибка при получении записи" }, { status: 500 });
	}
}

// PUT /api/bookings/[id] - Обновить запись
async function updateBookingHandler(req: NextRequest, { user, scope, params }: { user: any; scope: any; params: { id: string } }) {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID записи" }, { status: 400 });
		}

		const body: UpdateBookingRequest = await req.json();

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

		// Получаем текущую запись
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const currentBooking = await withDbRetry(async () => {
			return await prisma.booking.findUnique({
				where: { id },
				include: {
					bookingDepartment: true,
				},
			});
		});

		if (!currentBooking) {
			return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
		}

		// Проверяем, что отдел для записей существует (если указан)
		let bookingDepartment = currentBooking.bookingDepartment;
		if (body.bookingDepartmentId !== undefined && body.bookingDepartmentId !== currentBooking.bookingDepartmentId) {
			const newBookingDepartment = await withDbRetry(async () => {
				return await prisma.bookingDepartment.findUnique({
					where: { id: body.bookingDepartmentId },
				});
			});

			if (!newBookingDepartment) {
				return NextResponse.json({ error: "Отдел для записей не найден" }, { status: 404 });
			}

			bookingDepartment = newBookingDepartment;
		}

		// Если указан managerId, проверяем что менеджер существует
		if (body.managerId !== undefined && body.managerId !== null) {
			const manager = await withDbRetry(async () => {
				return await prisma.user.findUnique({
					where: { id: body.managerId as number },
				});
			});

			if (!manager) {
				return NextResponse.json({ error: "Менеджер не найден" }, { status: 404 });
			}
		}

		// Обрабатываем клиента: либо используем существующий clientId, либо сохраняем данные незарегистрированного клиента
		let finalClientId: number | null = null;
		let guestClientName: string | undefined = undefined;
		let finalContactPhone: string | undefined = undefined;

		// Если указан contactPhone, используем его
		if (body.contactPhone !== undefined) {
			if (!body.contactPhone || body.contactPhone.trim() === "") {
				return NextResponse.json({ error: "Телефон для связи обязателен" }, { status: 400 });
			}
			finalContactPhone = body.contactPhone.trim();
		}

		if (body.clientId !== undefined && body.clientId !== null && body.clientId !== 0) {
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
			// Если клиент выбран и contactPhone не указан в запросе, используем текущий contactPhone из записи
			// (не меняем его, если не указан явно)
			if (finalContactPhone === undefined) {
				finalContactPhone = currentBooking.contactPhone;
			}
		} else if (body.clientId === null) {
			// Если явно указано null - убираем привязку к клиенту
			finalClientId = null;
			// Если contactPhone не указан, оставляем текущий
			if (finalContactPhone === undefined) {
				finalContactPhone = currentBooking.contactPhone;
			}
		} else {
			// Если clientId не меняется, но contactPhone не указан, оставляем текущий
			if (finalContactPhone === undefined) {
				finalContactPhone = currentBooking.contactPhone;
			}
		}

		// Если указано имя незарегистрированного клиента
		if (body.clientName !== undefined) {
			guestClientName = body.clientName || undefined;
		}

		// Обновляем запись в транзакции
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const updatedBooking = await withDbRetry(async () => {
			return await prisma.$transaction(async (tx) => {
				// Подготавливаем данные для обновления
				const updateData: any = {};

				if (body.scheduledDate !== undefined) {
					updateData.scheduledDate = new Date(body.scheduledDate);
				}

				if (body.scheduledTime !== undefined) {
					updateData.scheduledTime = body.scheduledTime;
				}

				// Обрабатываем contactPhone
				if (finalContactPhone !== undefined) {
					updateData.contactPhone = finalContactPhone;
				}

				// Обрабатываем clientId
				if (body.clientId !== undefined) {
					updateData.clientId = finalClientId;
				}

				if (body.managerId !== undefined) {
					updateData.managerId = body.managerId;
				}

				if (body.bookingDepartmentId !== undefined) {
					updateData.bookingDepartmentId = body.bookingDepartmentId;
				}

				// Обновляем связь с заказом
				if (body.orderId !== undefined) {
					updateData.orderId = body.orderId;
				}

				if (body.status !== undefined) {
					updateData.status = body.status;
				}

				// Обрабатываем notes: добавляем имя незарегистрированного клиента, если оно есть
				// Всегда обрабатываем notes, если есть изменения в клиенте или в самих notes
				if (body.notes !== undefined || guestClientName !== undefined || (body.clientId !== undefined && finalClientId !== currentBooking.clientId)) {
					let bookingNotes = body.notes !== undefined ? body.notes : currentBooking.notes || "";

					// Если есть имя незарегистрированного клиента, добавляем его в notes
					if (guestClientName !== undefined) {
						// Удаляем старый блок с данными незарегистрированного клиента, если он есть
						bookingNotes = bookingNotes.replace(/--- Данные незарегистрированного клиента ---\s*[\s\S]*?\s*---\s*/g, "").trim();

						if (guestClientName) {
							// Добавляем новый блок с именем
							const guestInfoLines: string[] = [];
							guestInfoLines.push("--- Данные незарегистрированного клиента ---");
							guestInfoLines.push(`Имя: ${guestClientName}`);
							guestInfoLines.push("---");

							// Добавляем к существующим notes
							if (bookingNotes) {
								bookingNotes = `${bookingNotes}\n\n${guestInfoLines.join("\n")}`;
							} else {
								bookingNotes = guestInfoLines.join("\n");
							}
						}
					} else if (finalClientId !== null) {
						// Если клиент привязан, удаляем блок с данными незарегистрированного клиента
						bookingNotes = bookingNotes.replace(/--- Данные незарегистрированного клиента ---\s*[\s\S]*?\s*---\s*/g, "").trim();
					}

					updateData.notes = bookingNotes || null;
				}

				// Обновляем запись
				const booking = await tx.booking.update({
					where: { id },
					data: updateData,
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

				// Определяем тип действия для лога
				let action = "update";
				let message = "Запись обновлена";

				if (body.status !== undefined && body.status !== currentBooking.status) {
					action = "status_change";
					message = `Статус записи изменен на "${body.status}"`;
				}

				if (body.managerId !== undefined && body.managerId !== currentBooking.managerId) {
					if (body.managerId === null) {
						action = "unassign";
						message = "Менеджер снят с записи";
					} else {
						action = "assign";
						message = "Менеджер назначен на запись";
					}
				}

				// Получаем менеджера для снапшота (если назначен)
				let managerSnapshot: ManagerSnapshotForBookingLog | undefined = undefined;
				if (booking.managerId) {
					const managerForSnapshot = await tx.user.findUnique({
						where: { id: booking.managerId },
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

				// Подготавливаем снапшоты
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
					id: booking.id,
					scheduledDate: booking.scheduledDate,
					scheduledTime: booking.scheduledTime,
					contactPhone: booking.contactPhone,
					status: booking.status,
					managerId: booking.managerId,
					clientId: booking.clientId,
					bookingDepartmentId: booking.bookingDepartmentId,
					notes: booking.notes,
				};

				const departmentSnapshot: BookingDepartmentSnapshotForLog = {
					id: bookingDepartment.id,
					name: bookingDepartment.name,
					address: bookingDepartment.address,
					phones: bookingDepartment.phones,
					emails: bookingDepartment.emails,
				};

				// Подготавливаем данные для лога
				const logData: {
					action: string;
					message: string;
					bookingId: number;
					adminSnapshot: AdminSnapshotForBookingLog;
					bookingSnapshot: BookingSnapshotForLog;
					managerSnapshot?: ManagerSnapshotForBookingLog;
					departmentSnapshot: BookingDepartmentSnapshotForLog;
				} = {
					action,
					message,
					bookingId: booking.id,
					adminSnapshot,
					bookingSnapshot,
					departmentSnapshot,
				};

				// Добавляем managerSnapshot только если менеджер назначен
				if (managerSnapshot !== undefined) {
					logData.managerSnapshot = managerSnapshot;
				}

				// Создаем лог обновления
				await tx.bookingLog.create({
					data: logData,
				});

				return booking;
			});
		});

		const response: BookingResponse = {
			booking: updatedBooking,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Ошибка при обновлении записи:", error);
		return NextResponse.json({ error: "Ошибка при обновлении записи" }, { status: 500 });
	}
}

// DELETE /api/bookings/[id] - Удалить запись
async function deleteBookingHandler(req: NextRequest, { user, scope, params }: { user: any; scope: any; params: { id: string } }) {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID записи" }, { status: 400 });
		}

		// Проверяем, что запись существует
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const existingBooking = await withDbRetry(async () => {
			return await prisma.booking.findUnique({
				where: { id },
			});
		});

		if (!existingBooking) {
			return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
		}

		// Удаляем запись
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		await withDbRetry(async () => {
			return await prisma.booking.delete({
				where: { id },
			});
		});

		return NextResponse.json({ message: "Запись успешно удалена" }, { status: 200 });
	} catch (error) {
		console.error("Ошибка при удалении записи:", error);
		return NextResponse.json({ error: "Ошибка при удалении записи" }, { status: 500 });
	}
}

// Экспорт с проверкой разрешений
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const resolvedParams = await params;
	return withPermission(getBookingHandler, "view_bookings", ["superadmin", "admin", "manager"])(req, {
		params: resolvedParams,
	});
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const resolvedParams = await params;
	return withPermission(updateBookingHandler, "manage_bookings", ["superadmin", "admin"])(req, {
		params: resolvedParams,
	});
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const resolvedParams = await params;
	return withPermission(deleteBookingHandler, "manage_bookings", ["superadmin", "admin"])(req, {
		params: resolvedParams,
	});
}
