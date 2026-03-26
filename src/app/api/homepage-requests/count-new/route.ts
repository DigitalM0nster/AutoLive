export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";

export const GET = withPermission(
	async (_req: NextRequest) => {
		try {
			const newCount = await withDbRetry(async () =>
				prisma.homepageRequest.count({
					where: { status: "new" },
				}),
			);
			return NextResponse.json({ newCount });
		} catch (e) {
			console.error("homepage-requests/count-new:", e);
			return NextResponse.json({ newCount: 0 });
		}
	},
	"view_orders",
	["superadmin", "admin", "manager"],
);
