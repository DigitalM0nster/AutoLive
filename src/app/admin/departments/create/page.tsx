"use client";

import CreateDepartmentForm from "./CreateDepartmentForm";

export default function DepartmentCreatePage() {
	return (
		<div className="screenContent">
			<div className="screenTitle">Создание отдела</div>
			<div className="borderBlock">
				<CreateDepartmentForm />
			</div>
		</div>
	);
}
