import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";

// Вспомогательная: проверка доступа к заказу. view_orders у менеджеров/админов — scope "all", доступ к любому заказу.
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

// POST — создать ТО для заказа (если у заказа ещё нет ТО)
async function createHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
	try {
		const segments = req.nextUrl.pathname.split("/");
		const orderId = parseInt(segments[segments.length - 2], 10);
		if (isNaN(orderId)) {
			return NextResponse.json({ error: "Неверный ID заказа" }, { status: 400 });
		}

		const body = await req.json();
		const number = typeof body.number === "string" ? body.number.trim() : "";
		if (!number) {
			return NextResponse.json({ error: "Номер ТО обязателен" }, { status: 400 });
		}

		const responsibleUserId = body.responsibleUserId != null ? (body.responsibleUserId === "" ? null : parseInt(String(body.responsibleUserId), 10)) : null;
		if (responsibleUserId !== null && isNaN(responsibleUserId)) {
			return NextResponse.json({ error: "Некорректный ID ответственного" }, { status: 400 });
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
		if (order.technicalService) {
			return NextResponse.json({ error: "У заказа уже есть связанное ТО. Сначала удалите его." }, { status: 409 });
		}

		if (responsibleUserId != null) {
			const exists = await prisma.user.findUnique({ where: { id: responsibleUserId }, select: { id: true } });
			if (!exists) {
				return NextResponse.json({ error: "Ответственный не найден" }, { status: 400 });
			}
		}

		const to = await prisma.technicalService.create({
			data: {
				number,
				orderId,
				responsibleUserId,
			},
			include: {
				responsibleUser: { select: { id: true, first_name: true, last_name: true, role: true } },
			},
		});

		return NextResponse.json({ technicalService: to });
	} catch (e) {
		console.error("TechnicalService create:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// PATCH — изменить ТО заказа
async function updateHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
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
			include: { technicalService: { select: { id: true, number: true } } },
		});
		if (!order || !order.technicalService) {
			return NextResponse.json({ error: "Заказ или связанное ТО не найдены" }, { status: 404 });
		}

		const body = await req.json();
		const data: { number?: string; responsibleUserId?: number | null } = {};

		if (body.number !== undefined) {
			const number = typeof body.number === "string" ? body.number.trim() : "";
			data.number = number || order.technicalService.number || "";
		}
		if (body.responsibleUserId !== undefined) {
			const v = body.responsibleUserId;
			if (v === null || v === "") {
				data.responsibleUserId = null;
			} else {
				const id = parseInt(String(v), 10);
				if (!isNaN(id)) {
					const u = await prisma.user.findUnique({ where: { id }, select: { id: true } });
					if (!u) return NextResponse.json({ error: "Ответственный не найден" }, { status: 400 });
					data.responsibleUserId = id;
				}
			}
		}

		const to = await prisma.technicalService.update({
			where: { id: order.technicalService.id },
			data,
			include: {
				responsibleUser: { select: { id: true, first_name: true, last_name: true, role: true } },
			},
		});

		return NextResponse.json({ technicalService: to });
	} catch (e) {
		console.error("TechnicalService update:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// DELETE — удалить ТО у заказа
async function deleteHandler(req: NextRequest, { user, scope }: { user: any; scope: "all" | "department" | "own" }) {
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
			include: { technicalService: { select: { id: true } } },
		});
		if (!order || !order.technicalService) {
			return NextResponse.json({ error: "Заказ или связанное ТО не найдены" }, { status: 404 });
		}

		await prisma.technicalService.delete({
			where: { id: order.technicalService.id },
		});

		return NextResponse.json({ success: true });
	} catch (e) {
		console.error("TechnicalService delete:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// Права: view_orders — у менеджеров и выше scope "all", можно добавлять/редактировать/удалять ТО у любого заказа
const PERMISSION = "view_orders" as const;
const ROLES = ["superadmin", "admin", "manager"] as const;

export const POST = withPermission(createHandler, PERMISSION, [...ROLES]);
export const PATCH = withPermission(updateHandler, PERMISSION, [...ROLES]);
export const DELETE = withPermission(deleteHandler, PERMISSION, [...ROLES]);
