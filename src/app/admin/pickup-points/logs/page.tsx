import Link from "next/link";
import AllPickupPointsLogsComponent from "../local_components/allPickupPointsLogs/AllPickupPointsLogsComponent";

export default function PickupPointsLogsPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href="/admin/pickup-points" className="tabButton">
						Список пунктов выдачи
					</Link>
					<div className="tabButton active">История изменений</div>
				</div>
				<AllPickupPointsLogsComponent />
			</div>
		</div>
	);
}
