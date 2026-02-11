import Link from "next/link";
import CategoryLogsComponent from "../local_components/categoryLogs/CategoryLogsComponent";

export default function CategoriesLogsPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href="/admin/categories" className="tabButton">
						Список категорий
					</Link>
					<Link href="/admin/categories/logs" className="tabButton active">
						Логи категорий
					</Link>
				</div>
				<CategoryLogsComponent />
			</div>
		</div>
	);
}
