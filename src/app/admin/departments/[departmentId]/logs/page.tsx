"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import DepartmentLogsComponent from "../../local_components/DepartmentLogsComponent";

export default function DepartmentLogsPage() {
	const params = useParams();
	const departmentId = Array.isArray(params.departmentId) ? params.departmentId[0] : params.departmentId;

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<Link href={`/admin/departments/${departmentId}`} className={`tabButton`}>
						Управление отделом
					</Link>
					<Link href={`/admin/departments/${departmentId}/logs`} className={`tabButton active`}>
						История изменений отдела
					</Link>
				</div>
				<DepartmentLogsComponent departmentId={Number(departmentId)} />
			</div>
		</div>
	);
}
