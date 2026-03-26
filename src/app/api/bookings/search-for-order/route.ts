import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";

/**
 * GET /api/bookings/search-for-order?q=12&forOrderId=5
 * Поиск по префиксу ID только среди записей без привязанного заказа (для привязки к заказу в админке).
 */
async function searchBookingsForOrderHandler(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const q = (searchParams.get("q") || "").trim();
		const forOrderIdRaw = searchParams.get("forOrderId");

		if (!q || !/^\d+$/.test(q)) {
			return NextResponse.json({ bookings: [], forOrderId: forOrderIdRaw ? parseInt(forOrderIdRaw, 10) : null });
		}

		const pattern = `${q}%`;

		// Только записи, к которым ещё не привязан заказ (ни один order.booking_id не указывает на эту запись)
		const idRows = await withDbRetry(async () => {
			return prisma.$queryRaw<{ id: number }[]>(
				Prisma.sql`
					SELECT b.id FROM booking b
					WHERE CAST(b.id AS TEXT) LIKE ${pattern}
					AND NOT EXISTS (SELECT 1 FROM "order" o WHERE o.booking_id = b.id)
					ORDER BY b.id ASC
					LIMIT 20
				`,
			);
		});

		const ids = idRows.map((r) => r.id);
		if (ids.length === 0) {
			return NextResponse.json({ bookings: [], forOrderId: forOrderIdRaw ? parseInt(forOrderIdRaw, 10) : null });
		}

		const bookings = await withDbRetry(async () => {
			return prisma.booking.findMany({
				// Доп. проверка: в списке только записи без связанного заказа
				where: { id: { in: ids }, order: { is: null } },
				orderBy: { id: "asc" },
				select: {
					id: true,
					scheduledDate: true,
					scheduledTime: true,
					contactPhone: true,
					status: true,
					notes: true,
					createdAt: true,
					updatedAt: true,
					client: {
						select: { id: true, first_name: true, last_name: true, phone: true },
					},
					manager: {
						select: { id: true, first_name: true, last_name: true, phone: true },
					},
					bookingDepartment: {
						select: { id: true, name: true, address: true, phones: true },
					},
				},
			});
		});

		return NextResponse.json({
			bookings,
			forOrderId: forOrderIdRaw ? parseInt(forOrderIdRaw, 10) : null,
		});
	} catch (e) {
		console.error("search-for-order:", e);
		return NextResponse.json({ error: "Ошибка поиска записей" }, { status: 500 });
	}
}

export const GET = withPermission(searchBookingsForOrderHandler, "view_bookings", ["superadmin", "admin", "manager"]);
