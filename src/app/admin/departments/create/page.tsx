"use client";

import DepartmentPage from "../[departmentId]/page";

export default function DepartmentCreatePage() {
	return (
		<div className="screenContent">
			<div className="screenTitle">Создание отдела</div>
			<div className="borderBlock">
				<DepartmentPage isCreateMode={true} />
			</div>
		</div>
	);
}
