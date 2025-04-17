// src/app/api/products/check-duplicate/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const sku = searchParams.get("sku");
	const brand = searchParams.get("brand");
	const departmentIdRaw = searchParams.get("departmentId");

	if (!sku || !brand) {
		return new NextResponse("Не переданы параметры", { status: 400 });
	}

	const departmentId = departmentIdRaw === "null" ? null : parseInt(departmentIdRaw || "");

	try {
		const existing = await prisma.product.findFirst({
			where: {
				sku,
				brand,
				departmentId: departmentId ?? null,
			},
			include: {
				category: true,
				department: true,
			},
		});

		if (existing) {
			return NextResponse.json({ exists: true, product: existing });
		}

		return NextResponse.json({ exists: false });
	} catch (err) {
		console.error("Ошибка при проверке дубликата:", err);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
