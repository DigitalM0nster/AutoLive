// src/app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { UpdateBookingRequest, BookingResponse } from "@/lib/types";

const prisma = new PrismaClient();

// GET /api/bookings/[id] - Получить запись по ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID записи" }, { status: 400 });
		}

		const booking = await prisma.booking.findUnique({
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
			},
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
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID записи" }, { status: 400 });
		}

		const body: UpdateBookingRequest = await request.json();

		// Проверяем, что запись существует
		const existingBooking = await prisma.booking.findUnique({
			where: { id },
		});

		if (!existingBooking) {
			return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
		}

		// Если указан managerId, проверяем что менеджер существует
		if (body.managerId) {
			const manager = await prisma.user.findUnique({
				where: { id: body.managerId },
			});

			if (!manager) {
				return NextResponse.json({ error: "Менеджер не найден" }, { status: 404 });
			}
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

		// Подготавливаем данные для обновления
		const updateData: any = {};

		if (body.scheduledDate !== undefined) {
			updateData.scheduledDate = new Date(body.scheduledDate);
		}

		if (body.scheduledTime !== undefined) {
			updateData.scheduledTime = body.scheduledTime;
		}

		if (body.clientId !== undefined) {
			updateData.clientId = body.clientId;
		}

		if (body.managerId !== undefined) {
			updateData.managerId = body.managerId;
		}

		if (body.status !== undefined) {
			updateData.status = body.status;
		}

		if (body.notes !== undefined) {
			updateData.notes = body.notes;
		}

		// Обновляем запись
		const booking = await prisma.booking.update({
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
			},
		});

		const response: BookingResponse = {
			booking,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Ошибка при обновлении записи:", error);
		return NextResponse.json({ error: "Ошибка при обновлении записи" }, { status: 500 });
	}
}

// DELETE /api/bookings/[id] - Удалить запись
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID записи" }, { status: 400 });
		}

		// Проверяем, что запись существует
		const existingBooking = await prisma.booking.findUnique({
			where: { id },
		});

		if (!existingBooking) {
			return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
		}

		// Удаляем запись
		await prisma.booking.delete({
			where: { id },
		});

		return NextResponse.json({ message: "Запись успешно удалена" }, { status: 200 });
	} catch (error) {
		console.error("Ошибка при удалении записи:", error);
		return NextResponse.json({ error: "Ошибка при удалении записи" }, { status: 500 });
	}
}
