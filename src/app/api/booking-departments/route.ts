// src/app/api/booking-departments/route.ts

import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { withDbRetry } from "@/lib/utils";
import { AdminSnapshotForBookingLog, BookingDepartmentSnapshotForLog } from "@/lib/types";

// GET /api/booking-departments - Получить список отделов для записей
export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		try {
			// Все пользователи (суперадмины, админы и менеджеры) могут видеть отделы для записей
			const bookingDepartments = await prisma.bookingDepartment.findMany({
				select: {
					id: true,
					name: true,
					address: true,
					phones: true,
					emails: true,
					createdAt: true,
					updatedAt: true,
				},
				orderBy: {
					name: "asc",
				},
			});

			return NextResponse.json(bookingDepartments);
		} catch (err) {
			console.error("Ошибка загрузки отделов для записей:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_bookings",
	["superadmin", "admin", "manager"]
);

// POST /api/booking-departments - Создать новый отдел для записей
export const POST = withPermission(
	async (req: NextRequest, { user }) => {
		try {
			const body = await req.json();
			const { name, address, phones, emails } = body;

			// Валидация - address обязателен
			if (!address) {
				return NextResponse.json({ error: "Адрес отдела обязателен" }, { status: 400 });
			}

			// Проверяем, что phones - массив (если передан)
			if (phones !== undefined && !Array.isArray(phones)) {
				return NextResponse.json({ error: "Телефоны должны быть массивом" }, { status: 400 });
			}

			// Проверяем, что emails - массив (если передан)
			if (emails !== undefined && !Array.isArray(emails)) {
				return NextResponse.json({ error: "Почты должны быть массивом" }, { status: 400 });
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

			// Создаем отдел для записей в транзакции
			const bookingDepartment = await prisma.$transaction(async (tx) => {
				// Создаем отдел для записей
				const newBookingDepartment = await tx.bookingDepartment.create({
					data: {
						name: name || null,
						address,
						phones: phones || [],
						emails: emails || [],
					},
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
					id: newBookingDepartment.id,
					name: newBookingDepartment.name,
					address: newBookingDepartment.address,
					phones: newBookingDepartment.phones,
					emails: newBookingDepartment.emails,
				};

				// Создаем лог создания отдела
				await tx.bookingDepartmentLog.create({
					data: {
						action: "create",
						message: `Адрес создан`,
						bookingDepartmentId: newBookingDepartment.id,
						adminSnapshot,
						bookingDepartmentSnapshot,
					},
				});

				return newBookingDepartment;
			});

			return NextResponse.json(bookingDepartment, { status: 201 });
		} catch (error) {
			console.error("Ошибка при создании отдела для записей:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_bookings",
	["superadmin", "admin"]
);
