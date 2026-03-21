// GET — одна запись на ТО текущего клиента

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/requireClientSession";
import { withDbRetry } from "@/lib/utils";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const session = await requireClientSession();
	if ("error" in session) {
		return NextResponse.json({ error: session.error }, { status: session.status });
	}

	const idRaw = (await ctx.params).id;
	const bookingId = parseInt(idRaw, 10);
	if (Number.isNaN(bookingId) || bookingId < 1) {
		return NextResponse.json({ error: "Некорректный номер записи" }, { status: 400 });
	}

	try {
		const b = await withDbRetry(() =>
			prisma.booking.findFirst({
				where: { id: bookingId, clientId: session.userId },
				select: {
					id: true,
					scheduledDate: true,
					scheduledTime: true,
					contactPhone: true,
					status: true,
					notes: true,
					createdAt: true,
					bookingDepartment: {
						select: { name: true, address: true, phones: true, emails: true },
					},
				},
			})
		);

		if (!b) {
			return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
		}

		return NextResponse.json({
			id: b.id,
			scheduledDate: b.scheduledDate.toISOString().slice(0, 10),
			scheduledTime: b.scheduledTime,
			contactPhone: b.contactPhone,
			status: b.status,
			notes: b.notes,
			createdAt: b.createdAt.toISOString(),
			departmentName: b.bookingDepartment.name,
			departmentAddress: b.bookingDepartment.address,
			departmentPhones: b.bookingDepartment.phones,
			departmentEmails: b.bookingDepartment.emails,
		});
	} catch (e) {
		console.error("profile/bookings/[id] GET:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
