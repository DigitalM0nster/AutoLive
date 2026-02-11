import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ServiceKitLogsContent from "../../local_components/serviceKitLogs/ServiceKitLogsContent";

export default async function ServiceKitLogsPage({ params }: { params: Promise<{ kitId: string }> }) {
	const { kitId } = await params;
	const serviceKitId = parseInt(kitId, 10);

	if (isNaN(serviceKitId)) {
		notFound();
	}

	const kit = await prisma.serviceKit.findUnique({
		where: { id: serviceKitId },
		select: { id: true, title: true },
	});

	if (!kit) {
		notFound();
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href={`/admin/product-management/kits/${kitId}`} className="tabButton">
						Управление комплектом ТО
					</Link>
					<Link href={`/admin/product-management/kits/${kitId}/logs`} className="tabButton active">
						История изменений комплекта ТО
					</Link>
				</div>
				<div className="tableContent">
					<ServiceKitLogsContent serviceKitId={serviceKitId} kitTitle={kit.title} />
				</div>
			</div>
		</div>
	);
}
