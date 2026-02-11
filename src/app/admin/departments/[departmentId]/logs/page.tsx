import Link from "next/link";
import DepartmentLogsComponent from "../../local_components/departmentLogs/DepartmentLogsComponent";
import styles from "../../local_components/styles.module.scss";

type PageParams = {
	params: Promise<{
		departmentId: string;
	}>;
};

export default async function DepartmentLogsPage({ params }: PageParams) {
	const { departmentId } = await params;

	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer ${styles.tableContainer}`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<Link href={`/admin/departments/${departmentId}`} className={`tabButton`}>
						Управление отделом
					</Link>
					<Link href={`/admin/departments/${departmentId}/logs`} className={`tabButton active`}>
						История изменений
					</Link>
				</div>
				<DepartmentLogsComponent departmentId={Number(departmentId)} />
			</div>
		</div>
	);
}
