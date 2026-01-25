import Link from "next/link";
import AllServiceKitsLogsComponent from "../local_components/allServiceKitsLogs/AllServiceKitsLogsComponent";

export default function ServiceKitsLogsPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href="/admin/product-management/kits" className="tabButton">
						Список комплектов ТО
					</Link>
					<div className="tabButton active">История изменений</div>
				</div>
				<AllServiceKitsLogsComponent />
			</div>
		</div>
	);
}
