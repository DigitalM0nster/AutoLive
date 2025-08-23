// src\lib\logProductChange.ts

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type LogOptions = {
	productId: number;
	userId: number;
	action: "create" | "update" | "delete";
	message?: string | null;
};

export async function logProductChange({ productId, userId, action, message = null }: LogOptions) {
	const product = await prisma.product.findUnique({
		where: { id: productId },
		include: {
			department: { select: { id: true, name: true } },
			category: { select: { id: true, title: true } },
		},
	});

	if (!product) return;

	let snapshotBefore = null;
	let snapshotAfter = null;
	let departmentId = product.departmentId ?? null;

	if (action === "update") {
		const previous = await prisma.product.findFirst({
			where: { id: productId },
			orderBy: { updatedAt: "asc" },
		});
		snapshotBefore = previous || null;
		snapshotAfter = product;
	} else if (action === "create") {
		snapshotAfter = product;
	} else if (action === "delete") {
		snapshotBefore = product;
	}

	await prisma.product_log.create({
		data: {
			action,
			message,
			user_snapshot: {
				id: userId,
				// Дополнительные данные пользователя можно получить отдельным запросом если нужно
			},
			department_snapshot: {
				id: departmentId,
				name: product.department?.name,
			},
			product_snapshot: {
				id: product.id,
				title: product.title,
				price: product.price,
				sku: product.sku,
				brand: product.brand,
			},
			// Временные поля для совместимости
			user_id: userId,
			department_id: departmentId,
			product_id: productId,
			snapshot_before: snapshotBefore ? JSON.stringify(snapshotBefore) : null,
			snapshot_after: snapshotAfter ? JSON.stringify(snapshotAfter) : null,
		},
	});
}
