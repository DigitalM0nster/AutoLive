import AllOrdersTable from "./local_components/allOrders/AllOrdersTable";
import styles from "./local_components/styles.module.scss";
import Link from "next/link";

export default function OrdersPage() {
	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer ${styles.tableContainer}`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<div className={`tabButton active`}>Список заказов</div>
					<Link href="/admin/orders/logs" className={`tabButton`}>
						История изменений
					</Link>
				</div>

				<AllOrdersTable />
			</div>
		</div>
	);
}
