import BookingDepartmentFormComponent from "../local_components/bookingDepartment/BookingDepartmentFormComponent";

export default function CreateBookingDepartmentPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<div className="tabButton active">Создание адреса</div>
				</div>
				<div className="tableContent bookingComponent">
					<BookingDepartmentFormComponent isCreating={true} />
				</div>
			</div>
		</div>
	);
}
