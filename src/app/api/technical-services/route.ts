import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";

const bookingForContextInclude = {
	manager: {
		select: { id: true, first_name: true, last_name: true, phone: true, role: true },
	},
	bookingDepartment: {
		select: { id: true, name: true, address: true },
	},
	client: {
		select: { id: true, phone: true, first_name: true, last_name: true },
	},
} as const;

type BookingCtx = {
	scheduledDate: string | null;
	scheduledTime: string | null;
	contactPhone: string | null;
	clientPhone: string | null;
	departmentName: string | null;
	departmentAddress: string | null;
};

function bookingToMeta(
	booking: {
		scheduledDate: Date;
		scheduledTime: string;
		contactPhone: string;
		manager: { id: number; first_name: string | null; last_name: string | null; phone: string; role: string } | null;
		bookingDepartment: { name: string | null; address: string };
		client: { phone: string } | null;
	},
): { meta: BookingCtx } {
	const clientPhone = (booking.client?.phone && String(booking.client.phone).trim()) || booking.contactPhone || null;
	const scheduledDate =
		booking.scheduledDate instanceof Date
			? booking.scheduledDate.toISOString().slice(0, 10)
			: String(booking.scheduledDate).slice(0, 10);
	return {
		meta: {
			scheduledDate,
			scheduledTime: booking.scheduledTime,
			contactPhone: booking.contactPhone,
			clientPhone,
			departmentName: booking.bookingDepartment?.name ?? null,
			departmentAddress: booking.bookingDepartment?.address ?? null,
		},
	};
}

/** Условие доступа к заказу — как в GET /api/orders/[orderId] */
function buildOrderAccessWhere(
	orderId: number,
	scope: "all" | "department" | "own",
	fullUser: { departmentId: number | null } | null,
	userId: number,
): Prisma.OrderWhereInput {
	if (scope === "all") {
		return { id: orderId };
	}
	if (scope === "department" && fullUser) {
		return {
			id: orderId,
			OR: [{ managerId: null }, { departmentId: fullUser.departmentId }, { managerId: userId }],
		};
	}
	return { id: orderId };
}

/**
 * Поиск записей ТО по id или номеру (для привязки к заказу).
 * GET ?search=...&limit=20&forOrderId=123
 *
 * В списке дополняем данными из записи (booking): дата/время, отдел, телефоны.
 * Ответственный за ТО — только responsibleUser из справочника; менеджер записи (Booking) отдаётся отдельным полем bookingManager.
 * forOrderId — контекст «текущего заказа»: для ТО ещё без привязки показываем данные записи этого заказа.
 */
async function searchTechnicalServicesHandler(
	req: NextRequest,
	{ user, scope }: { user: { id: number; role: string }; scope: "all" | "department" | "own" },
) {
	try {
		const { searchParams } = new URL(req.url);
		const raw = (searchParams.get("search") || "").trim();
		const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);
		const forOrderIdRaw = searchParams.get("forOrderId");

		if (raw.length < 1) {
			return NextResponse.json({ technicalServices: [] });
		}

		const numericId = parseInt(raw, 10);
		const orFilters: Prisma.TechnicalServiceWhereInput[] = [
			{ number: { contains: raw, mode: Prisma.QueryMode.insensitive } },
		];
		if (!Number.isNaN(numericId)) {
			orFilters.push({ id: numericId });
		}

		const list = await prisma.technicalService.findMany({
			where: { OR: orFilters },
			take: limit,
			orderBy: { id: "desc" },
			include: {
				responsibleUser: {
					select: {
						id: true,
						first_name: true,
						last_name: true,
						phone: true,
						role: true,
					},
				},
			},
		});

		const tsIds = list.map((t) => t.id);
		if (tsIds.length === 0) {
			return NextResponse.json({ technicalServices: [] });
		}

		const linkedOrders = await prisma.order.findMany({
			where: { technicalServiceId: { in: tsIds } },
			include: {
				booking: {
					include: bookingForContextInclude,
				},
				client: {
					select: { id: true, first_name: true, last_name: true },
				},
				orderItems: {
					select: { product_price: true, quantity: true },
				},
			},
		});
		const orderByTsId = new Map(
			linkedOrders.filter((o) => o.technicalServiceId != null).map((o) => [o.technicalServiceId as number, o]),
		);

		let previewBooking: (typeof linkedOrders)[0]["booking"] = null;
		const forOid = forOrderIdRaw ? parseInt(forOrderIdRaw, 10) : NaN;
		if (!Number.isNaN(forOid)) {
			const fullUser = await prisma.user.findUnique({
				where: { id: user.id },
				select: { departmentId: true },
			});
			const whereOrder = buildOrderAccessWhere(forOid, scope, fullUser, user.id);
			const ctxOrder = await prisma.order.findFirst({
				where: whereOrder,
				include: {
					booking: {
						include: bookingForContextInclude,
					},
				},
			});
			previewBooking = ctxOrder?.booking ?? null;
		}

		const enriched = list.map((ts) => {
			const linked = orderByTsId.get(ts.id);
			const linkedBooking = linked?.booking ?? null;

			let bookingContext: BookingCtx | null = null;
			let contextSource: "linked_order" | "current_order_preview" | "none" = "none";

			if (linkedBooking) {
				const { meta } = bookingToMeta(linkedBooking as Parameters<typeof bookingToMeta>[0]);
				bookingContext = meta;
				contextSource = "linked_order";
			} else if (previewBooking) {
				const { meta } = bookingToMeta(previewBooking as Parameters<typeof bookingToMeta>[0]);
				bookingContext = meta;
				contextSource = "current_order_preview";
			}

			const bookingManager = linkedBooking?.manager ?? (!linkedBooking && previewBooking ? previewBooking.manager : null) ?? null;

			// Заказ, привязанный к этой записи ТО (один-к-одному по technicalServiceId)
			let linkedOrder: {
				id: number;
				status: string;
				createdAt: string;
				finalDeliveryDate: string | null;
				orderTotal: number;
				client: { id: number; first_name: string | null; last_name: string | null } | null;
			} | null = null;
			if (linked) {
				const orderTotal = linked.orderItems.reduce((sum, it) => sum + it.product_price * it.quantity, 0);
				linkedOrder = {
					id: linked.id,
					status: linked.status,
					createdAt: linked.createdAt.toISOString(),
					finalDeliveryDate: linked.finalDeliveryDate ? linked.finalDeliveryDate.toISOString() : null,
					orderTotal: Math.round(orderTotal * 100) / 100,
					client: linked.client
						? {
								id: linked.client.id,
								first_name: linked.client.first_name,
								last_name: linked.client.last_name,
							}
						: null,
				};
			}

			return {
				...ts,
				bookingContext,
				contextSource,
				bookingManager,
				linkedOrder,
			};
		});

		return NextResponse.json({ technicalServices: enriched });
	} catch (e) {
		console.error("technical-services GET:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

export const GET = withPermission(searchTechnicalServicesHandler, "view_orders", ["superadmin", "admin", "manager"]);
