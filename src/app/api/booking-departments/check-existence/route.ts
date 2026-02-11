import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";

export const GET = withPermission(
	async (req: NextRequest) => {
		try {
			const { searchParams } = new URL(req.url);
			const bookingDepartmentIdsParam = searchParams.get("bookingDepartmentIds");

			if (!bookingDepartmentIdsParam) {
				return NextResponse.json({ error: "bookingDepartmentIds обязателен" }, { status: 400 });
			}

			const bookingDepartmentIds = bookingDepartmentIdsParam
				.split(",")
				.map((id) => parseInt(id))
				.filter((id) => !isNaN(id));

			if (bookingDepartmentIds.length === 0) {
				return NextResponse.json({ existingBookingDepartmentIds: [] });
			}

			// Получаем существующие адреса
			const existingBookingDepartments = await prisma.bookingDepartment.findMany({
				where: {
					id: {
						in: bookingDepartmentIds,
					},
				},
				select: {
					id: true,
				},
			});

			const existingBookingDepartmentIds = existingBookingDepartments.map((dept) => dept.id);

			return NextResponse.json({
				existingBookingDepartmentIds,
			});
		} catch (error) {
			console.error("Ошибка при проверке существования адресов:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_bookings",
	["superadmin", "admin", "manager"]
);
