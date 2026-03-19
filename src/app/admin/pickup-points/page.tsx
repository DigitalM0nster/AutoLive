import AllPickupPointsTable from "./local_components/allPickupPoints/AllPickupPointsTable";
import styles from "../departments/local_components/styles.module.scss";
import Link from "next/link";

export default function PickupPointsPage() {
	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer ${styles.tableContainer}`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<div className={`tabButton active`}>Список пунктов выдачи</div>
					<Link href="/admin/pickup-points/logs" className={`tabButton`}>
						История изменений
					</Link>
				</div>

				<AllPickupPointsTable />
			</div>
		</div>
	);
}
