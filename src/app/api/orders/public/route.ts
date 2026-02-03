// Публичное оформление заказа без авторизации
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PublicOrderItem = {
	product_sku: string;
	product_title: string;
	product_price: number;
	product_brand: string;
	product_image?: string | null;
	quantity: number;
};

type PublicCreateOrderRequest = {
	name: string; // Имя клиента (произвольная строка)
	phone: string; // Телефон в формате 79XXXXXXXXX (сырое значение)
	orderItems: PublicOrderItem[];
};

export async function POST(req: NextRequest) {
	try {
		const body: PublicCreateOrderRequest = await req.json();

		// Базовая валидация
		const rawName = (body.name || "").trim();
		const rawPhone = (body.phone || "").trim();
		const items = Array.isArray(body.orderItems) ? body.orderItems : [];

		if (!rawName || rawName.length < 2) {
			return NextResponse.json({ error: "Введите имя" }, { status: 400 });
		}
		if (!/^\d{10,15}$/.test(rawPhone)) {
			// ожидаем телефон без символов, например 79951234567
			return NextResponse.json({ error: "Введите корректный телефон" }, { status: 400 });
		}
		if (items.length === 0) {
			return NextResponse.json({ error: "Корзина пуста" }, { status: 400 });
		}

		// Определяем отдел по товарам (по SKU)
		const skus = items.map((i) => i.product_sku);
		const products = await prisma.product.findMany({
			where: { sku: { in: skus } },
			select: { sku: true, departmentId: true },
		});
		const productSkuToDept = new Map(products.map((p) => [p.sku, p.departmentId]));
		const uniqueDepartments = new Set<number>();
		for (const it of items) {
			const dept = productSkuToDept.get(it.product_sku);
			if (typeof dept === "number") uniqueDepartments.add(dept);
		}
		const departmentId = uniqueDepartments.size === 1 ? [...uniqueDepartments][0] : null;

		// ПУБЛИЧНАЯ ЗАЯВКА: НЕ ПРИВЯЗЫВАЕМ заказ к пользователю по номеру телефона
		// Телефон и имя — это только контактные данные лида. Пользователь не создаётся и не изменяется.
		const normalizedPhone = rawPhone.length === 11 && rawPhone.startsWith("7") ? `+${rawPhone}` : rawPhone;

		// createdBy для публичной заявки — null (требует миграции: Order.createdBy сделать опциональным)

		// Создаём заказ и позиции в транзакции
		const order = await prisma.$transaction(async (tx) => {
			// Формируем структурированные комментарии с данными незарегистрированного клиента
			// Используем формат, аналогичный бронированиям, для единообразия
			const guestInfoComments: string[] = [];
			guestInfoComments.push("--- Данные незарегистрированного клиента ---");
			guestInfoComments.push(`Имя: ${rawName}`);
			guestInfoComments.push(`Телефон: ${normalizedPhone}`);
			guestInfoComments.push("---");

			const newOrder = await tx.order.create({
				data: {
					// Сохраняем контактные данные лида в структурированном виде в комментариях заказа
					comments: guestInfoComments,
					status: "created",
					clientId: null, // клиент не привязан — только контакты
					managerId: null,
					departmentId: departmentId,
					createdBy: undefined, // публичная заявка — без создателя в системе
				} as any,
			});

			await tx.orderItem.createMany({
				data: items.map((i) => ({
					orderId: newOrder.id,
					product_sku: i.product_sku,
					product_title: i.product_title,
					product_price: i.product_price,
					product_brand: i.product_brand,
					product_image: i.product_image || null,
					quantity: i.quantity,
				})),
			});

			return newOrder;
		});

		return NextResponse.json({ orderId: order.id }, { status: 201 });
	} catch (error) {
		console.error("Ошибка публичного оформления заказа:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
