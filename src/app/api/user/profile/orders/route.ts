// GET — заказы текущего клиента (только свои)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/requireClientSession";
import { withDbRetry } from "@/lib/utils";

export async function GET() {
	const session = await requireClientSession();
	if ("error" in session) {
		return NextResponse.json({ error: session.error }, { status: session.status });
	}

	try {
		const orders = await withDbRetry(() =>
			prisma.order.findMany({
				where: { clientId: session.userId },
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					status: true,
					createdAt: true,
					orderItems: {
						select: {
							product_title: true,
							quantity: true,
							product_price: true,
						},
					},
				},
			})
		);

		const payload = orders.map((o) => {
			const itemsCount = o.orderItems.reduce((s, i) => s + i.quantity, 0);
			const total = o.orderItems.reduce((s, i) => s + i.product_price * i.quantity, 0);
			return {
				id: o.id,
				status: o.status,
				createdAt: o.createdAt.toISOString(),
				itemsCount,
				total,
				previewTitles: o.orderItems.slice(0, 3).map((i) => i.product_title),
			};
		});

		return NextResponse.json(payload);
	} catch (e) {
		console.error("profile/orders GET:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
