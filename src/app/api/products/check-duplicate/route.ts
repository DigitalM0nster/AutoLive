// src\app\api\products\check-duplicate\route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const skuRaw = searchParams.get("sku");
	const brandRaw = searchParams.get("brand");
	const departmentIdRaw = searchParams.get("departmentId");
	const excludeIdRaw = searchParams.get("excludeId");

	if (!skuRaw || !brandRaw) {
		return new NextResponse("Не переданы параметры", { status: 400 });
	}

	const normalizedSku = skuRaw.trim().toLowerCase();
	const normalizedBrand = brandRaw.trim().toLowerCase();
	const departmentId = departmentIdRaw === "null" ? null : parseInt(departmentIdRaw || "");
	const excludeId = excludeIdRaw ? parseInt(excludeIdRaw) : null;

	try {
		const candidates = await prisma.product.findMany({
			where: departmentId === null ? {} : { departmentId },
			include: {
				category: true,
				department: true,
			},
		});

		const existing = candidates.find(
			(p) =>
				p.sku.trim().toLowerCase() === normalizedSku && p.brand.trim().toLowerCase() === normalizedBrand && (p.departmentId ?? null) === departmentId && p.id !== excludeId // 👈 вот здесь исключаем текущий
		);

		if (existing) {
			return NextResponse.json({ exists: true, product: existing });
		}

		return NextResponse.json({ exists: false });
	} catch (err) {
		console.error("Ошибка при проверке дубликата:", err);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
