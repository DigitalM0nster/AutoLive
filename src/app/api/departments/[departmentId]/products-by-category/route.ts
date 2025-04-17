// src\app\api\departments\[departmentId]\products-by-category\route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

export const GET = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const departmentId = Number(req.nextUrl.pathname.split("/")[3]);
		if (isNaN(departmentId)) return NextResponse.json({ error: "Неверный ID" }, { status: 400 });

		if (scope === "department" && user.departmentId !== departmentId) {
			return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
		}

		const result = await prisma.product.groupBy({
			by: ["categoryId"],
			where: { departmentId },
			_count: true,
		});

		// 👇 приводим null к 0
		const data = Object.fromEntries(result.map((r) => [r.categoryId ?? 0, r._count]));

		return NextResponse.json(data);
	},
	"view_products",
	["superadmin", "admin"]
);
