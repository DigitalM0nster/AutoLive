// GET — записи на ТО текущего клиента

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/requireClientSession";
import { withDbRetry } from "@/lib/utils";

export async function GET() {
	const session = await requireClientSession();
	if ("error" in session) {
		return NextResponse.json({ error: session.error }, { status: session.status });
	}

	try {
		const list = await withDbRetry(() =>
			prisma.booking.findMany({
				where: { clientId: session.userId },
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					scheduledDate: true,
					scheduledTime: true,
					contactPhone: true,
					status: true,
					notes: true,
					createdAt: true,
					bookingDepartment: {
						select: { name: true, address: true },
					},
				},
			})
		);

		const payload = list.map((b) => ({
			id: b.id,
			scheduledDate: b.scheduledDate.toISOString().slice(0, 10),
			scheduledTime: b.scheduledTime,
			contactPhone: b.contactPhone,
			status: b.status,
			notes: b.notes,
			createdAt: b.createdAt.toISOString(),
			departmentName: b.bookingDepartment.name,
			departmentAddress: b.bookingDepartment.address,
		}));

		return NextResponse.json(payload);
	} catch (e) {
		console.error("profile/bookings GET:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
