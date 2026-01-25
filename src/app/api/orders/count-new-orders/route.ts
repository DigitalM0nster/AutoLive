export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";

interface ExtendedRequestContext {
	user: { id: number; role: string; departmentId: number | null };
	scope: string;
}

export const GET = withPermission(
	async (_req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			// Обёртываем запросы в withDbRetry для автоматической обработки ошибок соединения
			// Это особенно важно для бесплатных БД, которые могут временно отключать соединения
			
			// Счётчик новых заявок без отдела
			const unassignedCount = await withDbRetry(async () => {
				return await prisma.order.count({
					where: { status: "created", departmentId: null },
				});
			});

			// Счётчик новых заявок по отделу пользователя (если отдел есть)
			let departmentCount = 0;
			if (user.departmentId) {
				departmentCount = await withDbRetry(async () => {
					return await prisma.order.count({
						where: { status: "created", departmentId: user.departmentId },
					});
				});
			}

			return NextResponse.json({ unassignedCount, departmentCount });
		} catch (e: any) {
			console.error("orders/new-counts error:", e);
			
			// Проверяем, является ли это ошибкой соединения
			const errorCode = e?.code || e?.meta?.code || "";
			const message = String(e?.message || "").toLowerCase();
			
			const isConnectionError =
				errorCode === "P1017" ||
				errorCode === "P2024" ||
				errorCode === "P1001" ||
				message.includes("server has closed the connection") ||
				message.includes("connection pool") ||
				message.includes("timed out");
			
			// Если это ошибка соединения, возвращаем нули вместо ошибки
			// Это позволяет интерфейсу работать, даже если БД временно недоступна
			if (isConnectionError) {
				return NextResponse.json({ unassignedCount: 0, departmentCount: 0 });
			}
			
			return NextResponse.json({ error: "Internal server error" }, { status: 500 });
		}
	},
	"view_orders",
	["superadmin", "admin", "manager"]
);
