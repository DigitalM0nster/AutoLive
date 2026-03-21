// GET — один заказ текущего клиента (без внутренних комментариев админки)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/requireClientSession";
import { withDbRetry } from "@/lib/utils";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const session = await requireClientSession();
	if ("error" in session) {
		return NextResponse.json({ error: session.error }, { status: session.status });
	}

	const idRaw = (await ctx.params).id;
	const orderId = parseInt(idRaw, 10);
	if (Number.isNaN(orderId) || orderId < 1) {
		return NextResponse.json({ error: "Некорректный номер заказа" }, { status: 400 });
	}

	try {
		const order = await withDbRetry(() =>
			prisma.order.findFirst({
				where: { id: orderId, clientId: session.userId },
				select: {
					id: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					finalDeliveryDate: true,
					orderItems: {
						select: {
							product_sku: true,
							product_title: true,
							product_price: true,
							product_brand: true,
							product_image: true,
							quantity: true,
							carModel: true,
							vinCode: true,
						},
					},
					bookingDepartment: {
						select: { name: true, address: true, phones: true },
					},
				},
			})
		);

		if (!order) {
			return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
		}

		const items = order.orderItems.map((i) => ({
			...i,
			lineTotal: i.product_price * i.quantity,
		}));
		const total = items.reduce((s, i) => s + i.lineTotal, 0);

		return NextResponse.json({
			id: order.id,
			status: order.status,
			createdAt: order.createdAt.toISOString(),
			updatedAt: order.updatedAt.toISOString(),
			finalDeliveryDate: order.finalDeliveryDate ? order.finalDeliveryDate.toISOString() : null,
			items,
			total,
			deliveryPoint: order.bookingDepartment,
		});
	} catch (e) {
		console.error("profile/orders/[id] GET:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
