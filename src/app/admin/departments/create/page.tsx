import DepartmentPageClient from "../local_components/DepartmentPageClient";

export default function DepartmentCreatePage() {
	return (
		<div className="screenContent">
			<div className="screenTitle">Создание нового отдела</div>
			<div className="borderBlock">
				<DepartmentPageClient isCreateMode={true} />
			</div>
		</div>
	);
}
