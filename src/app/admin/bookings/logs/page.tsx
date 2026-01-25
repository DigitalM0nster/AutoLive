import Link from "next/link";
import AllBookingsLogsComponent from "../local_components/allBookingsLogs/AllBookingsLogsComponent";

export default function BookingsLogsPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href="/admin/bookings" className="tabButton">
						Список записей
					</Link>
					<div className="tabButton active">История изменений</div>
				</div>
				<AllBookingsLogsComponent />
			</div>
		</div>
	);
}
