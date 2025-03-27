// src/app/api/breadcrumbs/resolve/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const ids: string[] = body?.ids || [];
		const segments: string[] = body?.segments || [];

		const labels: Record<string, string> = {};

		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];

			if (/^\d+$/.test(seg)) {
				const prev = segments[i - 1];

				if (prev === "promotions") {
					const promo = await prisma.promotion.findUnique({ where: { id: Number(seg) } });
					if (promo) labels[seg] = promo.title;
				}

				if (prev === "categories" || prev === "category") {
					const cat = await prisma.category.findUnique({ where: { id: Number(seg) } });
					if (cat) labels[seg] = cat.title;
				}

				if (["products", "items"].includes(prev)) {
					const product = await prisma.product.findUnique({ where: { id: Number(seg) } });
					if (product) labels[seg] = product.title;
				}
			}
		}

		return NextResponse.json({ labels });
	} catch (error) {
		console.error("Ошибка при получении динамических заголовков:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
