import Link from "next/link";
import BookingLogsComponent from "../../local_components/bookingLogs/BookingLogsComponent";

type PageParams = {
	params: Promise<{
		id: string;
	}>;
};

export default async function BookingDetailLogsPage({ params }: PageParams) {
	const { id } = await params;
	const bookingId = parseInt(id);

	// Проверяем, что ID корректный
	if (isNaN(bookingId)) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tableContent">
						<p>Некорректный ID записи</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href={`/admin/bookings/${bookingId}`} className="tabButton">
						Управление записью
					</Link>
					<Link href={`/admin/bookings/${bookingId}/logs`} className="tabButton active">
						История изменений записи
					</Link>
				</div>
				<BookingLogsComponent bookingId={bookingId} />
			</div>
		</div>
	);
}
