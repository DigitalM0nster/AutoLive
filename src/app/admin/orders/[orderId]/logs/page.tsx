import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import OrderLogsComponent from "../../local_components/orderLogs/OrderLogsComponent";

type PageParams = {
	params: Promise<{
		orderId: string;
	}>;
};

export default async function OrderLogsPage({ params }: PageParams) {
	const { orderId } = await params;
	const orderIdNum = parseInt(orderId, 10);

	if (isNaN(orderIdNum)) {
		notFound();
	}

	// Проверяем существование заказа (опционально, можно убрать если не критично)
	const order = await prisma.order.findUnique({
		where: { id: orderIdNum },
		select: { id: true },
	});

	if (!order) {
		notFound();
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href={`/admin/orders/${orderId}`} className="tabButton">
						Управление заказом
					</Link>
					<Link href={`/admin/orders/${orderId}/logs`} className="tabButton active">
						История изменений заказа
					</Link>
				</div>
				<OrderLogsComponent orderId={orderIdNum} />
			</div>
		</div>
	);
}
