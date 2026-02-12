// src/app/api/booking-departments/[id]/route.ts

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { withDbRetry } from "@/lib/utils";
import { AdminSnapshotForBookingLog, BookingDepartmentSnapshotForLog } from "@/lib/types";
import { logBookingDepartmentChangeCrossLogging } from "@/lib/crossLogging";

// GET /api/booking-departments/[id] - Получить адрес для записей по ID
export const GET = withPermission(
	async (req: NextRequest, { params, user, scope }: { params: Promise<{ id: string }>; user: any; scope: any }) => {
		try {
			const resolvedParams = await params;
			const id = parseInt(resolvedParams.id);

			if (isNaN(id)) {
				return NextResponse.json({ error: "Некорректный ID адреса" }, { status: 400 });
			}

			const bookingDepartment = await prisma.bookingDepartment.findUnique({
				where: { id },
				select: {
					id: true,
					name: true,
					address: true,
					phones: true,
					emails: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			if (!bookingDepartment) {
				return NextResponse.json({ error: "Адрес не найден" }, { status: 404 });
			}

			return NextResponse.json(bookingDepartment);
		} catch (error) {
			console.error("Ошибка при получении адреса для записей:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_bookings",
	["superadmin", "admin", "manager"]
);

// PUT /api/booking-departments/[id] - Обновить адрес для записей
export const PUT = withPermission(
	async (req: NextRequest, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
		try {
			const resolvedParams = await params;
			const id = parseInt(resolvedParams.id);

			if (isNaN(id)) {
				return NextResponse.json({ error: "Некорректный ID адреса" }, { status: 400 });
			}

			const body = await req.json();
			const { name, address, phones, emails } = body;

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

			// Проверяем, что адрес существует и сохраняем старый адрес для логирования
			const existingDepartment = await prisma.bookingDepartment.findUnique({
				where: { id },
			});

			if (!existingDepartment) {
				return NextResponse.json({ error: "Адрес не найден" }, { status: 404 });
			}

			// Сохраняем старый адрес для перекрёстного логирования
			const oldAddress = existingDepartment.address;

			// Валидация - address обязателен (если передан)
			if (address !== undefined && !address) {
				return NextResponse.json({ error: "Адрес обязателен" }, { status: 400 });
			}

			// Проверяем, что phones - массив (если передан)
			if (phones !== undefined && !Array.isArray(phones)) {
				return NextResponse.json({ error: "Телефоны должны быть массивом" }, { status: 400 });
			}

			// Проверяем, что emails - массив (если передан)
			if (emails !== undefined && !Array.isArray(emails)) {
				return NextResponse.json({ error: "Почты должны быть массивом" }, { status: 400 });
			}

				// Обновляем адрес в транзакции
			const bookingDepartment = await prisma.$transaction(async (tx) => {
				// Подготавливаем данные для обновления
				const updateData: any = {};

				if (name !== undefined) {
					updateData.name = name || null;
				}

				if (address !== undefined) {
					updateData.address = address;
				}

				if (phones !== undefined) {
					updateData.phones = phones || [];
				}

				if (emails !== undefined) {
					updateData.emails = emails || [];
				}

				// Обновляем адрес
				const updatedDepartment = await tx.bookingDepartment.update({
					where: { id },
					data: updateData,
				});

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

				const bookingDepartmentSnapshot: BookingDepartmentSnapshotForLog = {
					id: updatedDepartment.id,
					name: updatedDepartment.name,
					address: updatedDepartment.address,
					phones: updatedDepartment.phones,
					emails: updatedDepartment.emails,
				};

				// Формируем детальное сообщение об изменениях
				let message = "Адрес обновлен";
				const changes: string[] = [];
				if (name !== undefined && name !== existingDepartment.name) {
					changes.push(`название: '${existingDepartment.name || "нет"}' → '${name || "нет"}'`);
				}
				if (address !== undefined && address !== oldAddress) {
					changes.push(`адрес: '${oldAddress}' → '${address}'`);
				}
				if (phones !== undefined && JSON.stringify(phones) !== JSON.stringify(existingDepartment.phones)) {
					changes.push("телефоны");
				}
				if (emails !== undefined && JSON.stringify(emails) !== JSON.stringify(existingDepartment.emails)) {
					changes.push("почты");
				}
				if (changes.length > 0) {
					message = `Адрес обновлен: ${changes.join(", ")}`;
				}

				// Создаем лог обновления адреса
				await tx.bookingDepartmentLog.create({
					data: {
						action: "update",
						message,
						bookingDepartmentId: updatedDepartment.id,
						adminSnapshot,
						bookingDepartmentSnapshot,
					},
				});

				// Также логируем в общую таблицу ChangeLog для универсальности
				await tx.changeLog.create({
					data: {
						entityType: "booking_department",
						message,
						entityId: updatedDepartment.id,
						adminId: fullUser.id,
						departmentId: fullUser.departmentId,
						snapshotBefore: {
							id: existingDepartment.id,
							name: existingDepartment.name,
							address: oldAddress,
							phones: existingDepartment.phones,
							emails: existingDepartment.emails,
						} as any,
						snapshotAfter: bookingDepartmentSnapshot as any,
						adminSnapshot: adminSnapshot as any,
					},
				});

				return updatedDepartment;
			});

			// Выполняем перекрёстное логирование после транзакции
			// Проверяем, изменился ли адрес
			if (address !== undefined && address !== oldAddress) {
				await logBookingDepartmentChangeCrossLogging(
					id,
					oldAddress,
					address,
					{
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
					}
				);
			}

			return NextResponse.json(bookingDepartment);
		} catch (error) {
			console.error("Ошибка при обновлении адреса для записей:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_bookings",
	["superadmin", "admin"]
);

// DELETE /api/booking-departments/[id] - Удалить адрес для записей
export const DELETE = withPermission(
	async (req: NextRequest, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
		try {
			const resolvedParams = await params;
			const id = parseInt(resolvedParams.id);

			if (isNaN(id)) {
				return NextResponse.json({ error: "Некорректный ID адреса" }, { status: 400 });
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

			// Проверяем, что адрес существует и получаем его данные
			const existingDepartment = await prisma.bookingDepartment.findUnique({
				where: { id },
				include: {
					bookings: {
						select: {
							id: true,
						},
					},
				},
			});

			if (!existingDepartment) {
				return NextResponse.json({ error: "Адрес не найден" }, { status: 404 });
			}

			// Проверяем, есть ли записи, связанные с этим адресом
			if (existingDepartment.bookings.length > 0) {
				return NextResponse.json(
					{ error: `Невозможно удалить адрес. Существуют записи (${existingDepartment.bookings.length}), связанные с этим адресом` },
					{ status: 400 }
				);
			}

			// Удаляем адрес в транзакции, создавая логи ДО удаления
			await prisma.$transaction(async (tx) => {
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

				const bookingDepartmentSnapshot: BookingDepartmentSnapshotForLog = {
					id: existingDepartment.id,
					name: existingDepartment.name,
					address: existingDepartment.address,
					phones: existingDepartment.phones,
					emails: existingDepartment.emails,
				};

				// Создаем лог удаления адреса ДО удаления (чтобы он не удалился из-за Cascade)
				await tx.bookingDepartmentLog.create({
					data: {
						action: "delete",
						message: `Адрес удален`,
						bookingDepartmentId: existingDepartment.id, // Создаём лог ДО удаления, поэтому bookingDepartmentId ещё существует
						adminSnapshot,
						bookingDepartmentSnapshot,
					},
				});

				// Также логируем в общую таблицу ChangeLog для универсальности
				await tx.changeLog.create({
					data: {
						entityType: "booking_department", // Используем "booking_department" как тип сущности
						message: `Адрес отдела записи "${existingDepartment.name || "Без названия"}" удален`,
						entityId: existingDepartment.id,
						adminId: fullUser.id,
						departmentId: fullUser.departmentId,
						snapshotBefore: bookingDepartmentSnapshot as any,
						snapshotAfter: Prisma.JsonNull,
						adminSnapshot: adminSnapshot as any,
					},
				});

				// Удаляем адрес (логи уже созданы)
				await tx.bookingDepartment.delete({
					where: { id },
				});
			});

			return NextResponse.json({ message: "Адрес успешно удален" }, { status: 200 });
		} catch (error) {
			console.error("Ошибка при удалении адреса для записей:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_bookings",
	["superadmin", "admin"]
);
