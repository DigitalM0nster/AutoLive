import OrderLogsComponent from "../local_components/orderLogs/OrderLogsComponent";
import OrdersTabs from "../local_components/OrdersTabs";

export default function OrdersLogsPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<OrdersTabs />
				<OrderLogsComponent />
			</div>
		</div>
	);
}
