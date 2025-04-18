// src/app/api/logs/products-actions/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const [imports, products, bulk] = await Promise.all([
			prisma.importLog.findMany({
				include: {
					user: {
						select: {
							first_name: true,
							last_name: true,
							role: true,
							department: { select: { name: true } },
						},
					},
				},
			}),
			prisma.productLog.findMany({
				include: {
					user: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							role: true,
							department: { select: { name: true } },
						},
					},
					department: true,
				},
			}),
			prisma.bulkActionLog.findMany({
				include: {
					user: {
						select: {
							first_name: true,
							last_name: true,
							role: true,
							department: { select: { name: true } },
						},
					},
					department: true,
				},
			}),
		]);

		// Времена импортов (до секунды) + userId
		const importTimes = new Set(imports.map((i) => `${i.userId}|${i.createdAt.toISOString().slice(0, 19)}`));

		const filteredProductLogs = products.filter((log) => {
			const timeKey = `${log.user.id}|${log.createdAt.toISOString().slice(0, 19)}`;

			if (log.action === "create" && importTimes.has(timeKey)) {
				return false;
			}

			// логи, дублирующие массовое удаление, не исключаем здесь — т.к. удалённые id больше не известны
			return true;
		});

		const unifiedLogs = [
			...imports.map((log) => ({
				id: log.id,
				createdAt: log.createdAt,
				type: "import" as const,
				message: log.message,
				user: log.user,
				department: log.user.department,
				action: "Импорт товаров",
				details: {
					fileName: log.fileName,
					created: log.created,
					updated: log.updated,
					skipped: (log as any).skipped ?? 0,
					imagePolicy: (log as any).imagePolicy ?? null,
					markupSummary: (log as any).markupSummary ?? null,
				},
			})),

			...filteredProductLogs.map((log) => {
				const before = log.snapshotBefore || {};
				const after = log.snapshotAfter || {};
				const diff = [];

				if (log.action === "update") {
					for (const key in before) {
						if (before[key] !== after[key]) {
							diff.push({ key, before: before[key], after: after[key] });
						}
					}
				}

				return {
					id: log.id,
					createdAt: log.createdAt,
					type: "product" as const,
					message: log.message,
					user: log.user,
					department: log.department,
					action: log.action === "create" ? "Создание" : log.action === "delete" ? "Удаление" : "Редактирование",
					details: log.action === "create" ? { after } : log.action === "delete" ? { before } : { before, after, diff },
				};
			}),

			...bulk.map((log) => ({
				id: log.id,
				createdAt: log.createdAt,
				type: "bulk" as const,
				message: log.message,
				user: log.user,
				department: log.department,
				action: "Массовое удаление",
				details: {
					count: log.count,
					snapshots: log.snapshots ?? [],
				},
			})),
		].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		return NextResponse.json(unifiedLogs);
	} catch (error) {
		console.error("❌ Ошибка при получении unified-логов:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
