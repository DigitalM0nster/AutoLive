import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";

function buildOrderWhere(orderId: number, scope: string, fullUser: { id: number; departmentId: number | null }) {
	if (scope === "all") return { id: orderId };
	if (scope === "department") {
		return {
			id: orderId,
			OR: [{ managerId: null }, { departmentId: fullUser.departmentId }, { managerId: fullUser.id }],
		};
	}
	return { id: orderId };
}

/** Привязать заказ к записи ТО из справочника (или сменить привязку) */
async function linkHandler(req: NextRequest, { user, scope }: { user: { id: number }; scope: "all" | "department" | "own" }) {
	try {
		const segments = req.nextUrl.pathname.split("/");
		const orderId = parseInt(segments[segments.length - 2], 10);
		if (isNaN(orderId)) {
			return NextResponse.json({ error: "Неверный ID заказа" }, { status: 400 });
		}

		const body = await req.json();
		const technicalServiceIdRaw = body.technicalServiceId;
		if (technicalServiceIdRaw === undefined || technicalServiceIdRaw === null) {
			return NextResponse.json({ error: "Укажите technicalServiceId" }, { status: 400 });
		}
		const technicalServiceId = parseInt(String(technicalServiceIdRaw), 10);
		if (isNaN(technicalServiceId)) {
			return NextResponse.json({ error: "Некорректный ID ТО" }, { status: 400 });
		}

		const fullUser = await prisma.user.findUnique({
			where: { id: user.id },
			select: { id: true, departmentId: true },
		});
		if (!fullUser) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		const whereOrder = buildOrderWhere(orderId, scope, fullUser);
		const order = await prisma.order.findFirst({
			where: whereOrder,
			include: { technicalService: { select: { id: true } } },
		});
		if (!order) {
			return NextResponse.json({ error: "Заказ не найден или нет доступа" }, { status: 404 });
		}

		const ts = await prisma.technicalService.findUnique({
			where: { id: technicalServiceId },
			select: { id: true },
		});
		if (!ts) {
			return NextResponse.json({ error: "Запись ТО не найдена" }, { status: 404 });
		}

		const other = await prisma.order.findFirst({
			where: {
				technicalServiceId: technicalServiceId,
				NOT: { id: orderId },
			},
			select: { id: true },
		});
		if (other) {
			return NextResponse.json({ error: "Это ТО уже привязано к другому заказу" }, { status: 409 });
		}

		const updated = await prisma.order.update({
			where: { id: orderId },
			data: { technicalServiceId: technicalServiceId },
			include: {
				technicalService: {
					include: {
						responsibleUser: {
							select: { id: true, first_name: true, last_name: true, role: true, phone: true },
						},
					},
				},
			},
		});

		return NextResponse.json({ order: updated, technicalService: updated.technicalService });
	} catch (e) {
		console.error("TechnicalService link:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

/** Отвязать заказ от ТО (запись ТО в справочнике не удаляется) */
async function unlinkHandler(req: NextRequest, { user, scope }: { user: { id: number }; scope: "all" | "department" | "own" }) {
	try {
		const segments = req.nextUrl.pathname.split("/");
		const orderId = parseInt(segments[segments.length - 2], 10);
		if (isNaN(orderId)) {
			return NextResponse.json({ error: "Неверный ID заказа" }, { status: 400 });
		}

		const fullUser = await prisma.user.findUnique({
			where: { id: user.id },
			select: { id: true, departmentId: true },
		});
		if (!fullUser) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		const whereOrder = buildOrderWhere(orderId, scope, fullUser);
		const order = await prisma.order.findFirst({
			where: whereOrder,
			select: { id: true, technicalServiceId: true },
		});
		if (!order) {
			return NextResponse.json({ error: "Заказ не найден или нет доступа" }, { status: 404 });
		}
		if (!order.technicalServiceId) {
			return NextResponse.json({ error: "У заказа нет привязанного ТО" }, { status: 400 });
		}

		await prisma.order.update({
			where: { id: orderId },
			data: { technicalServiceId: null },
		});

		return NextResponse.json({ success: true });
	} catch (e) {
		console.error("TechnicalService unlink:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

const PERMISSION = "view_orders" as const;
const ROLES = ["superadmin", "admin", "manager"] as const;

export const POST = withPermission(linkHandler, PERMISSION, [...ROLES]);
export const PATCH = withPermission(linkHandler, PERMISSION, [...ROLES]);
export const DELETE = withPermission(unlinkHandler, PERMISSION, [...ROLES]);
