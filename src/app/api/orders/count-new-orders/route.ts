export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";

interface ExtendedRequestContext {
	user: { id: number; role: string; departmentId: number | null };
	scope: string;
}

export const GET = withPermission(
	async (_req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			// Счётчик новых заявок без отдела
			const unassignedCount = await prisma.order.count({
				where: { status: "created", departmentId: null },
			});

			// Счётчик новых заявок по отделу пользователя (если отдел есть)
			let departmentCount = 0;
			if (user.departmentId) {
				departmentCount = await prisma.order.count({
					where: { status: "created", departmentId: user.departmentId },
				});
			}

			return NextResponse.json({ unassignedCount, departmentCount });
		} catch (e) {
			console.error("orders/new-counts error:", e);
			return NextResponse.json({ error: "Internal server error" }, { status: 500 });
		}
	},
	"view_orders",
	["superadmin", "admin", "manager"]
);
