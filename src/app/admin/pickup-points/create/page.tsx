import PickupPointFormComponent from "../local_components/pickupPoint/PickupPointFormComponent";

export default function CreatePickupPointPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<div className="tabButton active">Создание пункта выдачи</div>
				</div>
				<div className="tableContent bookingComponent">
					<PickupPointFormComponent isCreating={true} />
				</div>
			</div>
		</div>
	);
}
