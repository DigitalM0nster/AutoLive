import HomepageRequestDetail from "./local_components/HomepageRequestDetail";

type Props = { params: Promise<{ id: string }> };

export default async function HomepageRequestPage({ params }: Props) {
	const { id: idStr } = await params;
	const id = parseInt(idStr, 10);
	if (Number.isNaN(id)) {
		return (
			<div className="screenContent">
				<p>Некорректный ID</p>
			</div>
		);
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<HomepageRequestDetail id={id} />
			</div>
		</div>
	);
}
