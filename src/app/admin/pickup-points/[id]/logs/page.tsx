import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PickupPointLogsComponent from "@/app/admin/pickup-points/local_components/pickupPointLogs/PickupPointLogsComponent";

export default async function PickupPointLogsPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const numId = parseInt(id);
	if (isNaN(numId)) notFound();

	const point = await prisma.pickupPoint.findUnique({
		where: { id: numId },
		select: { id: true, name: true, address: true },
	});
	if (!point) notFound();

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href={`/admin/pickup-points/${id}/edit`} className="tabButton">
						Редактирование пункта выдачи
					</Link>
					<Link href={`/admin/pickup-points/${id}/logs`} className="tabButton active">
						История изменений
					</Link>
				</div>
				<PickupPointLogsComponent pickupPointId={numId} />
			</div>
		</div>
	);
}
