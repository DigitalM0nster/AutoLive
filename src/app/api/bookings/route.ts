// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateBookingRequest, BookingResponse, BookingFilter } from "@/lib/types";

// GET /api/bookings - Получить список записей
export async function GET(request: NextRequest) {
	try {
		// Получаем параметры из URL
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const status = searchParams.get("status");
		const managerId = searchParams.get("managerId");
		const clientId = searchParams.get("clientId");
		const dateFrom = searchParams.get("dateFrom");
		const dateTo = searchParams.get("dateTo");

		// Строим фильтры
		const where: any = {};

		if (status) {
			where.status = status;
		}

		if (managerId && managerId !== "null") {
			where.managerId = parseInt(managerId);
		}

		if (clientId && clientId !== "null") {
			where.clientId = parseInt(clientId);
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

		// Подсчитываем общее количество записей
		const total = await prisma.booking.count({ where });

		// Получаем записи с пагинацией
		const bookings = await prisma.booking.findMany({
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
			},
			orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
			skip: (page - 1) * limit,
			take: limit,
		});

		const totalPages = Math.ceil(total / limit);

		const response: BookingResponse = {
			bookings,
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
export async function POST(request: NextRequest) {
	try {
		const body: CreateBookingRequest = await request.json();

		// Валидация обязательных полей
		if (!body.scheduledDate || !body.scheduledTime || !body.managerId) {
			return NextResponse.json({ error: "Обязательные поля: scheduledDate, scheduledTime, managerId" }, { status: 400 });
		}

		// Проверяем, что менеджер существует
		const manager = await prisma.user.findUnique({
			where: { id: body.managerId },
		});

		if (!manager) {
			return NextResponse.json({ error: "Менеджер не найден" }, { status: 404 });
		}

		// Если указан clientId, проверяем что клиент существует
		if (body.clientId) {
			const client = await prisma.user.findUnique({
				where: { id: body.clientId },
			});

			if (!client) {
				return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
			}
		}

		// Создаем запись
		const booking = await prisma.booking.create({
			data: {
				scheduledDate: new Date(body.scheduledDate),
				scheduledTime: body.scheduledTime,
				clientId: body.clientId || null,
				managerId: body.managerId,
				notes: body.notes || null,
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
			},
		});

		const response: BookingResponse = {
			booking,
		};

		return NextResponse.json(response, { status: 201 });
	} catch (error) {
		console.error("Ошибка при создании записи:", error);
		return NextResponse.json({ error: "Ошибка при создании записи" }, { status: 500 });
	}
}
