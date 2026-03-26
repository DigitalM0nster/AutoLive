import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";

/**
 * GET /api/orders/search-for-booking?q=12&forBookingId=5
 * Заказы без привязанной записи или уже привязанные к указанной записи (для связи из карточки записи).
 */
async function searchOrdersForBookingHandler(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const q = (searchParams.get("q") || "").trim();
		const forBookingIdRaw = searchParams.get("forBookingId");
		const forBookingId = forBookingIdRaw ? parseInt(forBookingIdRaw, 10) : NaN;

		if (!q || !/^\d+$/.test(q)) {
			return NextResponse.json({ orders: [], forBookingId: Number.isFinite(forBookingId) ? forBookingId : null });
		}

		const pattern = `${q}%`;

		const idRows = await withDbRetry(async () => {
			if (Number.isFinite(forBookingId)) {
				return prisma.$queryRaw<{ id: number }[]>(
					Prisma.sql`
						SELECT o.id FROM "order" o
						WHERE CAST(o.id AS TEXT) LIKE ${pattern}
						AND (o.booking_id IS NULL OR o.booking_id = ${forBookingId})
						ORDER BY o.id ASC
						LIMIT 20
					`,
				);
			}
			return prisma.$queryRaw<{ id: number }[]>(
				Prisma.sql`
					SELECT o.id FROM "order" o
					WHERE CAST(o.id AS TEXT) LIKE ${pattern}
					AND o.booking_id IS NULL
					ORDER BY o.id ASC
					LIMIT 20
				`,
			);
		});

		const ids = idRows.map((r) => r.id);
		if (ids.length === 0) {
			return NextResponse.json({ orders: [], forBookingId: Number.isFinite(forBookingId) ? forBookingId : null });
		}

		const orders = await withDbRetry(async () => {
			return prisma.order.findMany({
				where: {
					id: { in: ids },
					OR: Number.isFinite(forBookingId)
						? [{ bookingId: null }, { bookingId: forBookingId }]
						: [{ bookingId: null }],
				},
				orderBy: { id: "asc" },
				select: {
					id: true,
					status: true,
					createdAt: true,
					finalDeliveryDate: true,
					contactPhone: true,
					contactName: true,
					client: { select: { id: true, first_name: true, last_name: true } },
					orderItems: { select: { product_price: true, quantity: true } },
				},
			});
		});

		return NextResponse.json({
			orders,
			forBookingId: Number.isFinite(forBookingId) ? forBookingId : null,
		});
	} catch (e) {
		console.error("search-for-booking:", e);
		return NextResponse.json({ error: "Ошибка поиска заказов" }, { status: 500 });
	}
}

export const GET = withPermission(searchOrdersForBookingHandler, "view_orders", ["superadmin", "admin", "manager"]);
