import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BookingDepartmentFormComponent from "../../local_components/bookingDepartment/BookingDepartmentFormComponent";

export default async function EditBookingDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const bookingDepartmentId = parseInt(id);

	if (isNaN(bookingDepartmentId)) {
		notFound();
	}

	// Получаем данные адреса
	const bookingDepartment = await prisma.bookingDepartment.findUnique({
		where: { id: bookingDepartmentId },
	});

	if (!bookingDepartment) {
		notFound();
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<div className="tabButton active">Редактирование адреса</div>
				</div>
				<div className="tableContent bookingComponent">
					<BookingDepartmentFormComponent bookingDepartmentId={bookingDepartmentId} initialData={bookingDepartment} />
				</div>
			</div>
		</div>
	);
}
