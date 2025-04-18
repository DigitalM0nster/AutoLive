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

	await prisma.productLog.create({
		data: {
			action,
			userId,
			departmentId,
			productId,
			message,
			snapshotBefore: snapshotBefore ?? Prisma.JsonNull,
			snapshotAfter: snapshotAfter ?? Prisma.JsonNull,
		},
	});
}
