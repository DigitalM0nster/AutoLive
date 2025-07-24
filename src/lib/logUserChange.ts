// src\lib\logUserChange.ts

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type LogOptions = {
	targetUserId: number;
	adminId: number;
	action: "create" | "update" | "delete";
	message?: string | null;
	beforeData?: any;
	afterData?: any;
};

/**
 * Функция для логирования изменений пользователей
 * @param options Параметры логирования
 */
export async function logUserChange({ targetUserId, adminId, action, message = null, beforeData = null, afterData = null }: LogOptions) {
	try {
		// Получаем данные администратора, который внес изменения
		const admin = await prisma.user.findUnique({
			where: { id: adminId },
			select: { id: true, departmentId: true },
		});

		if (!admin) return;

		let snapshotBefore = null;
		let snapshotAfter = null;
		let departmentId = admin.departmentId ?? null;

		// Если beforeData и afterData не предоставлены, получаем их из базы данных
		if (action === "update" && (!beforeData || !afterData)) {
			const targetUser = await prisma.user.findUnique({
				where: { id: targetUserId },
				include: {
					department: { select: { id: true, name: true } },
				},
			});

			if (!targetUser) return;

			snapshotBefore = beforeData || null;
			snapshotAfter = targetUser;
		} else if (action === "create") {
			snapshotAfter = afterData;
		} else if (action === "delete") {
			snapshotBefore = beforeData;
		}

		// Создаем запись в логе
		await prisma.userLog.create({
			data: {
				action,
				adminId,
				targetUserId,
				departmentId,
				message,
				snapshotBefore: snapshotBefore ?? Prisma.JsonNull,
				snapshotAfter: snapshotAfter ?? Prisma.JsonNull,
			},
		});
	} catch (error) {
		console.error("Ошибка при логировании изменений пользователя:", error);
	}
}
