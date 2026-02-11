import Link from "next/link";
import OrderLogsComponent from "../local_components/orderLogs/OrderLogsComponent";

export default function OrdersLogsPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href="/admin/orders" className="tabButton">
						Список заказов
					</Link>
					<Link href="/admin/orders/logs" className="tabButton active">
						Логи заказов
					</Link>
				</div>
				<OrderLogsComponent />
			</div>
		</div>
	);
}
