// API: получение, обновление, удаление пункта выдачи по ID

import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { withDbRetry } from "@/lib/utils";
import { AdminSnapshotForBookingLog } from "@/lib/types";

// GET /api/pickup-points/[id]
export const GET = withPermission(
	async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
		try {
			const { id } = await params;
			const numId = parseInt(id);
			if (isNaN(numId)) {
				return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
			}
			const point = await prisma.pickupPoint.findUnique({
				where: { id: numId },
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
			});
			if (!point) {
				return NextResponse.json({ error: "Пункт выдачи не найден" }, { status: 404 });
			}
			return NextResponse.json(point);
		} catch (error) {
			console.error("Ошибка при получении пункта выдачи:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_bookings",
	["superadmin", "admin", "manager"]
);

// PUT /api/pickup-points/[id]
export const PUT = withPermission(
	async (req: NextRequest, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
		try {
			const { id } = await params;
			const numId = parseInt(id);
			if (isNaN(numId)) {
				return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
			}

			const body = await req.json();
			const { name, address, phones, emails, workingHours, showOnContactsPage, latitude, longitude } = body;

			const fullUser = await withDbRetry(() =>
				prisma.user.findUnique({
					where: { id: user.id },
					include: { department: { select: { id: true, name: true } } },
				})
			);
			if (!fullUser) {
				return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
			}

			const existing = await prisma.pickupPoint.findUnique({ where: { id: numId } });
			if (!existing) {
				return NextResponse.json({ error: "Пункт выдачи не найден" }, { status: 404 });
			}

			if (address !== undefined && !address) {
				return NextResponse.json({ error: "Адрес обязателен" }, { status: 400 });
			}
			if (phones !== undefined && !Array.isArray(phones)) {
				return NextResponse.json({ error: "Телефоны должны быть массивом" }, { status: 400 });
			}
			if (emails !== undefined && !Array.isArray(emails)) {
				return NextResponse.json({ error: "Почты должны быть массивом" }, { status: 400 });
			}

			const adminSnapshot: AdminSnapshotForBookingLog = {
				id: fullUser.id,
				first_name: fullUser.first_name,
				last_name: fullUser.last_name,
				role: fullUser.role,
				department: fullUser.department ? { id: fullUser.department.id, name: fullUser.department.name } : null,
			};

			const updateData: any = {};
			if (name !== undefined) updateData.name = name || null;
			if (address !== undefined) updateData.address = address;
			if (phones !== undefined) updateData.phones = phones || [];
			if (emails !== undefined) updateData.emails = emails || [];
			if (workingHours !== undefined) updateData.workingHours = workingHours === null || workingHours === "" ? null : String(workingHours).trim();
			if (showOnContactsPage !== undefined) updateData.showOnContactsPage = Boolean(showOnContactsPage);
			if (latitude !== undefined) updateData.latitude = latitude === null || latitude === "" ? null : Number(latitude);
			if (longitude !== undefined) updateData.longitude = longitude === null || longitude === "" ? null : Number(longitude);

			const changes: string[] = [];
			if (name !== undefined && name !== existing.name) changes.push(`название`);
			if (address !== undefined && address !== existing.address) changes.push(`адрес`);
			if (phones !== undefined && JSON.stringify(phones) !== JSON.stringify(existing.phones)) changes.push("телефоны");
			if (emails !== undefined && JSON.stringify(emails) !== JSON.stringify(existing.emails)) changes.push("почты");
			if (workingHours !== undefined && workingHours !== (existing as any).workingHours) changes.push("режим работы");
			if (showOnContactsPage !== undefined && showOnContactsPage !== (existing as any).showOnContactsPage) changes.push("отображение на странице контактов");
			const message = changes.length > 0 ? `Пункт выдачи обновлен: ${changes.join(", ")}` : "Пункт выдачи обновлен";

			const updated = await prisma.$transaction(async (tx) => {
				const point = await tx.pickupPoint.update({
					where: { id: numId },
					data: updateData,
				});
				const snapshot = {
					id: point.id,
					name: point.name,
					address: point.address,
					phones: point.phones,
					emails: point.emails,
					workingHours: point.workingHours,
					showOnContactsPage: point.showOnContactsPage,
				};
				await tx.pickupPointLog.create({
					data: {
						action: "update",
						message,
						pickupPointId: point.id,
						adminSnapshot: adminSnapshot as any,
						pickupPointSnapshot: snapshot as any,
					},
				});
				return point;
			});

			return NextResponse.json(updated);
		} catch (error) {
			console.error("Ошибка при обновлении пункта выдачи:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_bookings",
	["superadmin", "admin"]
);

// DELETE /api/pickup-points/[id]
export const DELETE = withPermission(
	async (_req: NextRequest, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
		try {
			const { id } = await params;
			const numId = parseInt(id);
			if (isNaN(numId)) {
				return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
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

			const existing = await prisma.pickupPoint.findUnique({ where: { id: numId } });
			if (!existing) {
				return NextResponse.json({ error: "Пункт выдачи не найден" }, { status: 404 });
			}

			const adminSnapshot: AdminSnapshotForBookingLog = {
				id: fullUser.id,
				first_name: fullUser.first_name,
				last_name: fullUser.last_name,
				role: fullUser.role,
				department: fullUser.department ? { id: fullUser.department.id, name: fullUser.department.name } : null,
			};
			const snapshot = {
				id: existing.id,
				name: existing.name,
				address: existing.address,
				phones: existing.phones,
				emails: existing.emails,
			};

			await prisma.$transaction(async (tx) => {
				await tx.pickupPointLog.create({
					data: {
						action: "delete",
						message: "Пункт выдачи удален",
						pickupPointId: existing.id,
						adminSnapshot: adminSnapshot as any,
						pickupPointSnapshot: snapshot as any,
					},
				});
				await tx.pickupPoint.delete({ where: { id: numId } });
			});

			return NextResponse.json({ message: "Пункт выдачи успешно удален" }, { status: 200 });
		} catch (error) {
			console.error("Ошибка при удалении пункта выдачи:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"manage_bookings",
	["superadmin", "admin"]
);
