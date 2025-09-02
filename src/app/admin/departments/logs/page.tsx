import styles from "../local_components/styles.module.scss";
import Link from "next/link";
import AllDepartmentsLogsComponent from "../local_components/allDepartmentsLogs/AllDepartmentsLogsComponent";

export default function DepartmentsLogsPage() {
	return (
		<div className={`screenContent`}>
			<div className="tableContainer">
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<Link href="/admin/departments/" className={`tabButton`}>
						Список отделов
					</Link>
					<div className={`tabButton active`}>История изменений</div>
				</div>
				<AllDepartmentsLogsComponent />
			</div>
		</div>
	);
}
