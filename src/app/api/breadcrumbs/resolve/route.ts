// src/app/api/breadcrumbs/resolve/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/utils";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const idsParam = searchParams.get("ids");
		const segmentsParam = searchParams.get("segments");

		if (!idsParam || !segmentsParam) {
			return NextResponse.json({ labels: {} });
		}

		const ids: string[] = JSON.parse(idsParam);
		const segments: string[] = JSON.parse(segmentsParam);

		const labels: Record<string, string> = {};

		// Все обращения к БД в одном withDbRetry — при обрыве соединения (Neon) запрос повторяется
		await withDbRetry(async () => {
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

					if (prev === "departments") {
						const department = await prisma.department.findUnique({ where: { id: Number(seg) } });
						if (department) labels[seg] = department.name;
					}

					if (prev === "users") {
						const user = await prisma.user.findUnique({ where: { id: Number(seg) } });
						if (user) {
							labels[seg] = `ID: ${seg} | ${user.phone}`;
						}
					}

					if (prev === "orders") {
						const order = await prisma.order.findUnique({ where: { id: Number(seg) } });
						if (order) {
							labels[seg] = `Заказ #${seg}`;
						}
					}

					if (prev === "bookings") {
						const booking = await prisma.booking.findUnique({ where: { id: Number(seg) } });
						if (booking) {
							labels[seg] = `Запись #${seg}`;
						}
					}

					if (prev === "kits") {
						const kit = await prisma.serviceKit.findUnique({ where: { id: Number(seg) } });
						if (kit) {
							labels[seg] = kit.title;
						}
					}
				}
			}
		});

		return NextResponse.json({ labels });
	} catch (error) {
		console.error("Ошибка при получении динамических заголовков:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
