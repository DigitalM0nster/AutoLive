import { db } from "@/drizzle/db";
import { products } from "@/drizzle/schema";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import { eq, and } from "drizzle-orm";

export const POST = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/")[3]);
		if (isNaN(departmentId)) return NextResponse.json({ error: "Неверный ID" }, { status: 400 });

		if (scope === "department" && user.departmentId !== departmentId) {
			return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
		}

		const { categoryId } = await req.json();
		if (!categoryId) return NextResponse.json({ error: "Не указана категория" }, { status: 400 });

		// Удаляем все продукты с этим departmentId и categoryId
		await db.delete(products).where(and(eq(products.departmentId, departmentId), eq(products.categoryId, categoryId)));

		return NextResponse.json({ success: true });
	},
	"edit_products",
	["superadmin", "admin"]
);
