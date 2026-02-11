import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BookingDepartmentLogsContent from "../../local_components/bookingDepartmentLogs/BookingDepartmentLogsContent";

export default async function BookingDepartmentLogsPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const bookingDepartmentId = parseInt(id, 10);

	if (isNaN(bookingDepartmentId)) {
		notFound();
	}

	const department = await prisma.bookingDepartment.findUnique({
		where: { id: bookingDepartmentId },
		select: { id: true, name: true, address: true },
	});

	if (!department) {
		notFound();
	}

	const title = department.name || department.address || `Адрес #${department.id}`;

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href={`/admin/booking-departments/${id}/edit`} className="tabButton">
						Редактирование адреса
					</Link>
					<Link href={`/admin/booking-departments/${id}/logs`} className="tabButton active">
						История изменений
					</Link>
				</div>
				<div className="tableContent">
					<BookingDepartmentLogsContent bookingDepartmentId={bookingDepartmentId} departmentName={title} />
				</div>
			</div>
		</div>
	);
}
