import AllBookingsTable from "./local_components/allBookings/AllBookingsTable";
import Link from "next/link";

export default function BookingsPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<div className="tabButton active">Список записей</div>
					<Link href="/admin/bookings/logs" className="tabButton">
						История изменений
					</Link>
				</div>

				<AllBookingsTable />
			</div>
		</div>
	);
}
