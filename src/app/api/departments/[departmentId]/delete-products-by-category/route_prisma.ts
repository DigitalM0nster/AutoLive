import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

export const POST = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/")[3]);
		if (isNaN(departmentId)) return NextResponse.json({ error: "Неверный ID" }, { status: 400 });

		if (scope === "department" && user.departmentId !== departmentId) {
			return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
		}

		const { categoryId } = await req.json();

		await prisma.product.deleteMany({
			where: { departmentId, categoryId },
		});

		return NextResponse.json({ success: true });
	},
	"edit_products",
	["superadmin", "admin"]
);
