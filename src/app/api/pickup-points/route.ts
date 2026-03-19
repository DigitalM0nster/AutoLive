// API: список и создание пунктов выдачи (аналогично booking-departments)

import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { withDbRetry } from "@/lib/utils";
import { AdminSnapshotForBookingLog } from "@/lib/types";

// GET /api/pickup-points — список пунктов выдачи
export const GET = withPermission(
	async () => {
		try {
			const list = await prisma.pickupPoint.findMany({
				select: {
					id: true,
					name: true,
					address: true,
					phones: true,
					emails: true,
					workingHours: true,
					showOnContactsPage: true,
					latitude: true,
					longitude: true,
					createdAt: true,
					updatedAt: true,
				},
				orderBy: { name: "asc" },
			});
			return NextResponse.json(list);
		} catch (err) {
			console.error("Ошибка загрузки пунктов выдачи:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_bookings",
	["superadmin", "admin", "manager"]
);

// POST /api/pickup-points — создание пункта выдачи
export const POST = withPermission(
	async (req: NextRequest, { user }) => {
		try {
			const body = await req.json();
			const { name, address, phones, emails, workingHours, showOnContactsPage, latitude, longitude } = body;

			if (!address) {
				return NextResponse.json({ error: "Адрес обязателен" }, { status: 400 });
			}
			if (phones !== undefined && !Array.isArray(phones)) {
				return NextResponse.json({ error: "Телефоны должны быть массивом" }, { status: 400 });
			}
			if (emails !== undefined && !Array.isArray(emails)) {
				return NextResponse.json({ error: "Почты должны быть массивом" }, { status: 400 });
			}

			const fullUser = await withDbRetry(() =>
				prisma.user.findUnique({
					where: { id: user.id },
					include: { department: { select: { id: true, name: true } } },
				})
			);
			if (!fullUser) {
				return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
			}

			const adminSnapshot: AdminSnapshotForBookingLog = {
				id: fullUser.id,
				first_name: fullUser.first_name,
				last_name: fullUser.last_name,
				role: fullUser.role,
				department: fullUser.department ? { id: fullUser.department.id, name: fullUser.department.name } : null,
			};

			const created = await prisma.$transaction(async (tx) => {
				const point = await tx.pickupPoint.create({
					data: {
						name: name || null,
						address,
						phones: phones || [],
						emails: emails || [],
						workingHours: workingHours != null && String(workingHours).trim() !== "" ? String(workingHours).trim() : null,
						showOnContactsPage: showOnContactsPage !== false,
						latitude: latitude != null ? Number(latitude) : null,
						longitude: longitude != null ? Number(longitude) : null,
					},
				});
				const snapshot = {
					id: point.id,
					name: point.name,
					address: point.address,
					phones: point.phones,
					emails: point.emails,
				};
				await tx.pickupPointLog.create({
					data: {
						action: "create",
						message: "Пункт выдачи создан",
						pickupPointId: point.id,
						adminSnapshot: adminSnapshot as any,
						pickupPointSnapshot: snapshot as any,
					},
				});
				return point;
			});

			return NextResponse.json(created, { status: 201 });
		} catch (error) {
			console.error("Ошибка при создании пункта выдачи:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_bookings",
	["superadmin", "admin"]
);
