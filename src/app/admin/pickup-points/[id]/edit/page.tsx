import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PickupPointFormComponent from "@/app/admin/pickup-points/local_components/pickupPoint/PickupPointFormComponent";

export default async function EditPickupPointPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const numId = parseInt(id);

	if (isNaN(numId)) {
		notFound();
	}

	const point = await prisma.pickupPoint.findUnique({
		where: { id: numId },
	});

	if (!point) {
		notFound();
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href={`/admin/pickup-points/${id}/edit`} className="tabButton active">
						Редактирование пункта выдачи
					</Link>
					<Link href={`/admin/pickup-points/${id}/logs`} className="tabButton">
						История изменений
					</Link>
				</div>
				<div className="tableContent bookingComponent">
					<PickupPointFormComponent
						isCreating={false}
						pickupPointId={numId}
						initialData={{
							id: point.id,
							name: point.name ?? undefined,
							address: point.address,
							phones: point.phones,
							emails: point.emails,
							createdAt: point.createdAt,
							updatedAt: point.updatedAt,
						}}
					/>
				</div>
			</div>
		</div>
	);
}
