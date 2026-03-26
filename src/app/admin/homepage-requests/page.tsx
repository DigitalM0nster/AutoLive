import HomepageRequestsTable from "./local_components/HomepageRequestsTable";
import Link from "next/link";

export default function HomepageRequestsPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<div className="tabButton active">Заявки с главной</div>
					<Link href="/admin/content/homepage" className="tabButton">
						Настройка формы на главной
					</Link>
				</div>
				<HomepageRequestsTable />
			</div>
		</div>
	);
}
