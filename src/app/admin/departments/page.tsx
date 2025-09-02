import AllDepartmentsTable from "./local_components/allDepartments/AllDepartmentsTable";
import styles from "./local_components/styles.module.scss";
import Link from "next/link";

export default function DepartmentsDashboardPage() {
	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer ${styles.tableContainer}`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<div className={`tabButton active`}>Список отделов</div>
					<Link href="/admin/departments/logs" className={`tabButton`}>
						История изменений
					</Link>
				</div>

				<AllDepartmentsTable />
			</div>
		</div>
	);
}
