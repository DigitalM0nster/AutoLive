import AllBookingDepartmentsTable from "./local_components/allBookingDepartments/AllBookingDepartmentsTable";
import styles from "../departments/local_components/styles.module.scss";
import Link from "next/link";

export default function BookingDepartmentsPage() {
	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer ${styles.tableContainer}`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<div className={`tabButton active`}>Список адресов</div>
					<Link href="/admin/booking-departments/logs" className={`tabButton`}>
						История изменений
					</Link>
				</div>

				<AllBookingDepartmentsTable />
			</div>
		</div>
	);
}
