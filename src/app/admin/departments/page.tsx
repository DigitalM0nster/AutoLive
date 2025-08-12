"use client";

import { useAuthStore } from "@/store/authStore";
import AllDepartmentsTable from "./local_components/AllDepartmentsTable";
import styles from "./local_components/styles.module.scss";
import Link from "next/link";

export default function DepartmentsDashboardPage() {
	const { user } = useAuthStore();

	if (!user) return null;

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
