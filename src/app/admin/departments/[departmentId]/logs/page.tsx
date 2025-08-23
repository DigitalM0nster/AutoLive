import Link from "next/link";
import DepartmentLogsComponent from "../../local_components/DepartmentLogsComponent";

type PageParams = {
	params: Promise<{
		departmentId: string;
	}>;
};

export default async function DepartmentLogsPage({ params }: PageParams) {
	const { departmentId } = await params;

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
