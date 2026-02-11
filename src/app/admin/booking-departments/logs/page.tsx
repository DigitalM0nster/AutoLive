import Link from "next/link";
import AllBookingDepartmentsLogsComponent from "../local_components/allBookingDepartmentsLogs/AllBookingDepartmentsLogsComponent";

export default function BookingDepartmentsLogsPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href="/admin/booking-departments" className="tabButton">
						Список адресов
					</Link>
					<div className="tabButton active">История изменений</div>
				</div>
				<AllBookingDepartmentsLogsComponent />
			</div>
		</div>
	);
}
