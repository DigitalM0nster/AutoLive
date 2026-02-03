// src/lib/crossLogging.ts
// Утилиты для перекрёстного логирования между связанными сущностями

import { prisma } from "@/lib/prisma";
import { AdminSnapshotForBookingLog, BookingDepartmentSnapshotForLog, BookingSnapshotForLog, ManagerSnapshotForBookingLog } from "@/lib/types";

/**
 * Получить полный снапшот заказа со всеми связанными данными
 * Включает: клиент, менеджер, отдел, товары, связанная запись, адрес доставки
 */
export async function getFullOrderSnapshot(orderId: number) {
	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			include: {
				client: {
					select: {
						id: true,
						phone: true,
						first_name: true,
						last_name: true,
						middle_name: true,
						role: true,
					},
				},
				manager: {
					select: {
						id: true,
						phone: true,
						first_name: true,
						last_name: true,
						middle_name: true,
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
				creator: {
					select: {
						id: true,
						phone: true,
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
				orderItems: {
					select: {
						id: true,
						product_sku: true,
						product_title: true,
						product_price: true,
						product_brand: true,
						product_image: true,
						quantity: true,
						supplierDeliveryDate: true,
						carModel: true,
						vinCode: true,
					},
				},
				booking: {
					select: {
						id: true,
						scheduledDate: true,
						scheduledTime: true,
						status: true,
						contactPhone: true,
						clientId: true,
						managerId: true,
						bookingDepartmentId: true,
						notes: true,
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
						responsibleUser: {
							select: {
								id: true,
								first_name: true,
								last_name: true,
								role: true,
							},
						},
						createdAt: true,
						updatedAt: true,
					},
				},
			},
		});

		if (!order) {
			return null;
		}

		return {
			id: order.id,
			comments: order.comments,
			status: order.status,
			createdAt: order.createdAt,
			updatedAt: order.updatedAt,
			confirmationDate: order.confirmationDate,
			finalDeliveryDate: order.finalDeliveryDate,
			assignedAt: order.assignedAt,
			clientId: order.clientId,
			managerId: order.managerId,
			departmentId: order.departmentId,
			createdBy: order.createdBy,
			bookingId: order.bookingId,
			bookingDepartmentId: order.bookingDepartmentId,
			// Связанные данные
			client: order.client,
			manager: order.manager,
			department: order.department,
			creator: order.creator,
			orderItems: order.orderItems,
			booking: order.booking,
			bookingDepartment: order.bookingDepartment,
			technicalService: order.technicalService,
		};
	} catch (error) {
		console.error("Ошибка при получении полного снапшота заказа:", error);
		return null;
	}
}

/**
 * Получить полный снапшот записи со всеми связанными данными
 * Включает: клиент, менеджер, отдел для записей, связанный заказ
 */
export async function getFullBookingSnapshot(bookingId: number) {
	try {
		const booking = await prisma.booking.findUnique({
			where: { id: bookingId },
			include: {
				client: {
					select: {
						id: true,
						phone: true,
						first_name: true,
						last_name: true,
						middle_name: true,
						role: true,
					},
				},
				manager: {
					select: {
						id: true,
						phone: true,
						first_name: true,
						last_name: true,
						middle_name: true,
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
						comments: true,
						createdAt: true,
						managerId: true,
						departmentId: true,
						clientId: true,
					},
				},
			},
		});

		if (!booking) {
			return null;
		}

		return {
			id: booking.id,
			scheduledDate: booking.scheduledDate,
			scheduledTime: booking.scheduledTime,
			contactPhone: booking.contactPhone,
			status: booking.status,
			managerId: booking.managerId,
			clientId: booking.clientId,
			bookingDepartmentId: booking.bookingDepartmentId,
			orderId: booking.orderId,
			notes: booking.notes,
			createdAt: booking.createdAt,
			updatedAt: booking.updatedAt,
			// Связанные данные
			client: booking.client,
			manager: booking.manager,
			bookingDepartment: booking.bookingDepartment,
			order: booking.order,
		};
	} catch (error) {
		console.error("Ошибка при получении полного снапшота записи:", error);
		return null;
	}
}

/**
 * Получить снапшот адреса отдела для записей
 */
export async function getBookingDepartmentSnapshot(bookingDepartmentId: number): Promise<BookingDepartmentSnapshotForLog | null> {
	try {
		const department = await prisma.bookingDepartment.findUnique({
			where: { id: bookingDepartmentId },
			select: {
				id: true,
				name: true,
				address: true,
				phones: true,
				emails: true,
			},
		});

		if (!department) {
			return null;
		}

		return {
			id: department.id,
			name: department.name,
			address: department.address,
			phones: department.phones,
			emails: department.emails,
		};
	} catch (error) {
		console.error("Ошибка при получении снапшота адреса отдела:", error);
		return null;
	}
}

/**
 * Перекрёстное логирование: при изменении адреса отдела записи
 * Создаёт логи во всех связанных записях и заказах
 */
export async function logBookingDepartmentChangeCrossLogging(
	bookingDepartmentId: number,
	oldAddress: string,
	newAddress: string,
	adminSnapshot: AdminSnapshotForBookingLog
) {
	try {
		// Находим все записи, связанные с этим отделом
		const relatedBookings = await prisma.booking.findMany({
			where: { bookingDepartmentId },
			select: {
				id: true,
				orderId: true,
			},
		});

		// Получаем снапшот отдела
		const departmentSnapshot = await getBookingDepartmentSnapshot(bookingDepartmentId);
		if (!departmentSnapshot) {
			console.error("Не удалось получить снапшот отдела для перекрёстного логирования");
			return;
		}

		// Для каждой связанной записи создаём лог
		for (const booking of relatedBookings) {
			// Получаем полный снапшот записи
			const bookingSnapshot = await getFullBookingSnapshot(booking.id);
			if (!bookingSnapshot) {
				continue;
			}

			// Создаём лог в BookingLog
			await prisma.bookingLog.create({
				data: {
					action: "update",
					message: `Изменён адрес отдела записи с '${oldAddress}' на '${newAddress}' (отдел: ${departmentSnapshot.name || "Без названия"}, ID: ${bookingDepartmentId})`,
					bookingId: booking.id,
					adminSnapshot,
					bookingSnapshot: {
						id: bookingSnapshot.id,
						scheduledDate: bookingSnapshot.scheduledDate,
						scheduledTime: bookingSnapshot.scheduledTime,
						contactPhone: bookingSnapshot.contactPhone,
						status: bookingSnapshot.status,
						managerId: bookingSnapshot.managerId,
						clientId: bookingSnapshot.clientId,
						bookingDepartmentId: bookingSnapshot.bookingDepartmentId,
						notes: bookingSnapshot.notes,
					},
					departmentSnapshot,
				},
			});

			// Если у записи есть связанный заказ, создаём лог и в OrderLog
			if (booking.orderId) {
				const orderSnapshot = await getFullOrderSnapshot(booking.orderId);
				if (orderSnapshot) {
					await prisma.orderLog.create({
						data: {
							action: "update",
							message: `Изменён адрес: был адрес отдела записи '${oldAddress}' (отдел: ${departmentSnapshot.name || "Без названия"}, ID: ${bookingDepartmentId}), теперь '${newAddress}', так как был изменён адрес отдела записи`,
							orderId: booking.orderId,
							adminSnapshot,
							orderSnapshot: {
								id: orderSnapshot.id,
								status: orderSnapshot.status,
								managerId: orderSnapshot.managerId,
								departmentId: orderSnapshot.departmentId,
								clientId: orderSnapshot.clientId,
								confirmationDate: orderSnapshot.confirmationDate,
								finalDeliveryDate: orderSnapshot.finalDeliveryDate,
								bookingId: orderSnapshot.bookingId,
								bookingDepartmentId: orderSnapshot.bookingDepartmentId,
							},
							departmentSnapshot: departmentSnapshot as any, // Сохраняем снапшот адреса отдела записи
						},
					});
				}
			}
		}

		console.log(`✅ Перекрёстное логирование выполнено для ${relatedBookings.length} записей`);
	} catch (error) {
		console.error("❌ Ошибка при перекрёстном логировании изменения адреса отдела:", error);
	}
}

/**
 * Перекрёстное логирование: при изменении записи
 * Создаёт лог в связанном заказе, если он есть
 */
export async function logBookingChangeCrossLogging(
	bookingId: number,
	bookingSnapshotBefore: any,
	bookingSnapshotAfter: any,
	adminSnapshot: AdminSnapshotForBookingLog,
	departmentSnapshot: BookingDepartmentSnapshotForLog,
	managerSnapshot?: ManagerSnapshotForBookingLog
) {
	try {
		// Получаем запись, чтобы узнать, есть ли связанный заказ
		const booking = await prisma.booking.findUnique({
			where: { id: bookingId },
			select: {
				orderId: true,
			},
		});

		if (!booking || !booking.orderId) {
			// Нет связанного заказа - перекрёстное логирование не требуется
			return;
		}

		// Получаем полный снапшот заказа
		const orderSnapshot = await getFullOrderSnapshot(booking.orderId);
		if (!orderSnapshot) {
			console.error("Не удалось получить снапшот заказа для перекрёстного логирования");
			return;
		}

		// Формируем сообщение о том, что изменилось в записи
		let changeMessage = "Связанная запись была изменена";
		if (bookingSnapshotBefore && bookingSnapshotAfter) {
			const changes: string[] = [];
			if (bookingSnapshotBefore.scheduledDate !== bookingSnapshotAfter.scheduledDate) {
				changes.push("дата записи");
			}
			if (bookingSnapshotBefore.scheduledTime !== bookingSnapshotAfter.scheduledTime) {
				changes.push("время записи");
			}
			if (bookingSnapshotBefore.status !== bookingSnapshotAfter.status) {
				changes.push(`статус (${bookingSnapshotBefore.status} → ${bookingSnapshotAfter.status})`);
			}
			if (bookingSnapshotBefore.managerId !== bookingSnapshotAfter.managerId) {
				changes.push("менеджер");
			}
			if (changes.length > 0) {
				changeMessage = `Связанная запись была изменена: ${changes.join(", ")}`;
			}
		}

		// Создаём лог в OrderLog
		await prisma.orderLog.create({
			data: {
				action: "update",
				message: changeMessage,
				orderId: booking.orderId,
				adminSnapshot,
				orderSnapshot: {
					id: orderSnapshot.id,
					status: orderSnapshot.status,
					managerId: orderSnapshot.managerId,
					departmentId: orderSnapshot.departmentId,
					clientId: orderSnapshot.clientId,
					confirmationDate: orderSnapshot.confirmationDate,
					finalDeliveryDate: orderSnapshot.finalDeliveryDate,
					bookingId: orderSnapshot.bookingId,
					bookingDepartmentId: orderSnapshot.bookingDepartmentId,
				},
				departmentSnapshot: departmentSnapshot as any, // Сохраняем снапшот адреса отдела записи
			},
		});

		console.log(`✅ Перекрёстное логирование выполнено для заказа ${booking.orderId}`);
	} catch (error) {
		console.error("❌ Ошибка при перекрёстном логировании изменения записи:", error);
	}
}

/**
 * Перекрёстное логирование: при удалении записи
 * Создаёт лог в связанном заказе с полным снапшотом удалённой записи
 */
export async function logBookingDeleteCrossLogging(
	bookingId: number,
	deletedBookingSnapshot: any,
	adminSnapshot: AdminSnapshotForBookingLog,
	departmentSnapshot: BookingDepartmentSnapshotForLog
) {
	try {
		// Получаем запись перед удалением, чтобы узнать, есть ли связанный заказ
		const booking = await prisma.booking.findUnique({
			where: { id: bookingId },
			select: {
				orderId: true,
			},
		});

		if (!booking || !booking.orderId) {
			// Нет связанного заказа - перекрёстное логирование не требуется
			return;
		}

		// Получаем полный снапшот заказа
		const orderSnapshot = await getFullOrderSnapshot(booking.orderId);
		if (!orderSnapshot) {
			console.error("Не удалось получить снапшот заказа для перекрёстного логирования");
			return;
		}

		// Формируем сообщение с информацией об удалённой записи
		const departmentInfo = departmentSnapshot.name ? `${departmentSnapshot.name} (ID: ${departmentSnapshot.id})` : `ID: ${departmentSnapshot.id}`;
		const addressInfo = departmentSnapshot.address || "адрес не указан";

		// Создаём лог в OrderLog
		await prisma.orderLog.create({
			data: {
				action: "update",
				message: `Связанная запись (ID: ${bookingId}) была удалена. Адрес отдела записи был: '${addressInfo}' (отдел: ${departmentInfo})`,
				orderId: booking.orderId,
				adminSnapshot,
				orderSnapshot: {
					id: orderSnapshot.id,
					status: orderSnapshot.status,
					managerId: orderSnapshot.managerId,
					departmentId: orderSnapshot.departmentId,
					clientId: orderSnapshot.clientId,
					confirmationDate: orderSnapshot.confirmationDate,
					finalDeliveryDate: orderSnapshot.finalDeliveryDate,
					bookingId: orderSnapshot.bookingId,
					bookingDepartmentId: orderSnapshot.bookingDepartmentId,
				},
				departmentSnapshot: departmentSnapshot as any, // Сохраняем снапшот адреса отдела записи
			},
		});

		console.log(`✅ Перекрёстное логирование удаления записи выполнено для заказа ${booking.orderId}`);
	} catch (error) {
		console.error("❌ Ошибка при перекрёстном логировании удаления записи:", error);
	}
}
