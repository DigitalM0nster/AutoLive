import Loading from "@/components/ui/loading/Loading";

export default function BookingDepartmentsLoading() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<div className="tabButton active">Список адресов</div>
					<div className="tabButton">История изменений</div>
				</div>
				<div className="tableContent">
					<Loading />
				</div>
			</div>
		</div>
	);
}
