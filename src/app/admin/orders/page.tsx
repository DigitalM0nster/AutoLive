import AllOrdersTable from "./local_components/allOrders/AllOrdersTable";
import OrdersTabs from "./local_components/OrdersTabs";
import styles from "./local_components/styles.module.scss";

export default function OrdersPage() {
	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer ${styles.tableContainer}`}>
				<OrdersTabs />
				<AllOrdersTable />
			</div>
		</div>
	);
}
