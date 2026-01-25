// src/app/api/bookings/public/route.ts
// Публичный endpoint для создания записи на ТО без авторизации (для клиентов)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/utils";

// Тип запроса для публичного создания записи
type PublicCreateBookingRequest = {
	scheduledDate: string; // Дата в формате YYYY-MM-DD
	scheduledTime: string; // Время в формате HH:MM
	bookingDepartmentId: number; // ID отдела для записи (обязательное поле)
	contactPhone: string; // Телефон для связи (обязательное поле, в формате 79951234567)
	clientName?: string; // Имя клиента (опционально, для незарегистрированных клиентов)
	notes?: string; // Примечания, тип услуги и т.д. (опционально)
};

// POST /api/bookings/public - Создать запись на ТО (публичный, без авторизации)
export async function POST(req: NextRequest) {
	try {
		const body: PublicCreateBookingRequest = await req.json();

		// Базовая валидация
		if (!body.scheduledDate || !body.scheduledTime) {
			return NextResponse.json({ error: "Укажите дату и время записи" }, { status: 400 });
		}

		if (!body.bookingDepartmentId || body.bookingDepartmentId === 0) {
			return NextResponse.json({ error: "Необходимо выбрать отдел для записи" }, { status: 400 });
		}

		if (!body.contactPhone || body.contactPhone.trim() === "") {
			return NextResponse.json({ error: "Телефон для связи обязателен" }, { status: 400 });
		}

		// Проверяем формат телефона (ожидаем телефон без символов, например 79951234567)
		const rawPhone = body.contactPhone.trim().replace(/\D/g, ""); // Удаляем все нецифровые символы
		if (!/^\d{10,15}$/.test(rawPhone)) {
			return NextResponse.json({ error: "Введите корректный телефон" }, { status: 400 });
		}

		// Нормализуем телефон (если 11 цифр и начинается с 7, добавляем +)
		const normalizedPhone = rawPhone.length === 11 && rawPhone.startsWith("7") ? `+${rawPhone}` : `+7${rawPhone.slice(-10)}`;

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

		// Формируем notes: добавляем имя незарегистрированного клиента, если оно есть
		let bookingNotes = body.notes || "";
		if (body.clientName && body.clientName.trim() !== "") {
			const guestInfoLines: string[] = [];
			guestInfoLines.push("--- Данные незарегистрированного клиента ---");
			guestInfoLines.push(`Имя: ${body.clientName.trim()}`);
			guestInfoLines.push("---");

			// Добавляем к существующим notes, если они есть
			if (bookingNotes) {
				bookingNotes = `${bookingNotes}\n\n${guestInfoLines.join("\n")}`;
			} else {
				bookingNotes = guestInfoLines.join("\n");
			}
		}

		// ПУБЛИЧНАЯ ЗАЯВКА: НЕ ПРИВЯЗЫВАЕМ запись к пользователю по номеру телефона
		// Телефон и имя — это только контактные данные лида. Пользователь не создаётся и не изменяется.
		// clientId = null, managerId = null (назначается позже админом)

		// Создаем запись в транзакции
		// Обёрнуто в withDbRetry для обработки ошибок соединения с Neon
		const booking = await withDbRetry(async () => {
			return await prisma.$transaction(async (tx) => {
				// Создаем запись
				const newBooking = await tx.booking.create({
					data: {
						scheduledDate: scheduledDate,
						scheduledTime: body.scheduledTime,
						contactPhone: normalizedPhone, // Телефон для связи (обязательное поле)
						clientId: null, // Клиент не привязан — только контакты
						managerId: null, // Менеджер назначается позже админом
						bookingDepartmentId: body.bookingDepartmentId,
						orderId: null, // Связь с заказом (если нужно, добавляется позже)
						notes: bookingNotes || null,
						status: "scheduled", // Начальный статус - запланирована
					},
				});

				return newBooking;
			});
		});

		return NextResponse.json({ bookingId: booking.id }, { status: 201 });
	} catch (error) {
		console.error("Ошибка публичного создания записи:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
