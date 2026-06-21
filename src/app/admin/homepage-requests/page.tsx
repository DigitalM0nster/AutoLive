import HomepageRequestsTable from "./local_components/HomepageRequestsTable";
import RequestsSectionTabs from "./local_components/RequestsSectionTabs";

export default function HomepageRequestsPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<RequestsSectionTabs active="requests" />
				<HomepageRequestsTable />
			</div>
		</div>
	);
}
