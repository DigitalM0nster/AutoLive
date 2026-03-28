/**
 * Текстовое описание изменений заказа для OrderLog / ChangeLog (было → стало).
 */

type SnapshotOrderItem = {
	product_sku: string;
	product_title?: string;
	quantity?: number;
	product_price?: number;
	supplierDeliveryDate?: Date | string | null;
	carModel?: string | null;
	vinCode?: string | null;
};

export type OrderSnapshotLike = {
	status: string;
	clientId?: number | null;
	managerId?: number | null;
	departmentId?: number | null;
	contactName?: string | null;
	contactPhone?: string | null;
	finalDeliveryDate?: Date | string | null;
	bookingId?: number | null;
	bookingDepartmentId?: number | null;
	deliveryPickupPointId?: number | null;
	comments?: unknown;
	orderItems?: SnapshotOrderItem[];
	client?: { id: number; first_name?: string | null; last_name?: string | null; phone?: string } | null;
	manager?: { id: number; first_name?: string | null; last_name?: string | null } | null;
	department?: { id: number; name: string } | null;
	booking?: { id: number } | null;
	bookingDepartment?: { id: number; name?: string | null; address?: string } | null;
	deliveryPickupPoint?: { id: number; name?: string | null; address?: string } | null;
};

function disp(v: unknown): string {
	if (v === null || v === undefined) return "—";
	if (typeof v === "string") return v.trim() || "—";
	return String(v);
}

function dispDate(v: unknown): string {
	if (v === null || v === undefined) return "—";
	try {
		const d = v instanceof Date ? v : new Date(v as string);
		if (Number.isNaN(d.getTime())) return disp(v);
		return d.toISOString().slice(0, 10);
	} catch {
		return disp(v);
	}
}

function clientLabel(c: OrderSnapshotLike["client"], clientId: number | null | undefined): string {
	if (c) {
		const fio = [c.last_name, c.first_name].filter(Boolean).join(" ").trim();
		return fio ? `${fio} (id ${c.id}, ${c.phone ?? "без тел."})` : `id ${c.id}`;
	}
	return clientId != null ? `id ${clientId}` : "—";
}

function managerLabel(m: OrderSnapshotLike["manager"], managerId: number | null | undefined): string {
	if (m) {
		const fio = [m.last_name, m.first_name].filter(Boolean).join(" ").trim();
		return fio ? `${fio} (id ${m.id})` : `id ${m.id}`;
	}
	return managerId != null ? `id ${managerId}` : "—";
}

function deptLabel(d: OrderSnapshotLike["department"], departmentId: number | null | undefined): string {
	if (d?.name) return `${d.name} (id ${d.id})`;
	return departmentId != null ? `id ${departmentId}` : "—";
}

function deliveryLabel(
	bd: OrderSnapshotLike["bookingDepartment"],
	pp: OrderSnapshotLike["deliveryPickupPoint"],
	bdId: number | null | undefined,
	ppId: number | null | undefined,
): string {
	if (pp) return `ПВЗ: ${pp.name || "—"} — ${pp.address ?? ""} (id ${pp.id})`;
	if (bd) return `Адрес записей: ${bd.name || "—"} — ${bd.address ?? ""} (id ${bd.id})`;
	if (ppId != null) return `ПВЗ id ${ppId}`;
	if (bdId != null) return `Адрес записей id ${bdId}`;
	return "—";
}

function sortItems(items: SnapshotOrderItem[]): SnapshotOrderItem[] {
	return [...items].sort((a, b) => a.product_sku.localeCompare(b.product_sku));
}

function itemLine(it: SnapshotOrderItem): string {
	const title = it.product_title ? ` «${it.product_title}»` : "";
	return `${it.product_sku}${title}: qty ${it.quantity ?? "?"}, дата поставщика ${dispDate(it.supplierDeliveryDate)}, авто ${disp(it.carModel)}, VIN ${disp(it.vinCode)}, цена ${it.product_price ?? "?"}`;
}

function commentsFingerprint(raw: unknown): string {
	if (raw == null) return "0";
	try {
		return JSON.stringify(raw);
	} catch {
		return String(raw);
	}
}

/**
 * Возвращает строки «Поле: было X → стало Y» для отображения в логе заказа.
 */
export function buildOrderUpdateDiffLines(before: OrderSnapshotLike | null, after: OrderSnapshotLike): string[] {
	const lines: string[] = [];
	if (!before) {
		return ["Снимок заказа до изменения недоступен; см. полный снимок после в логе."];
	}

	if (before.status !== after.status) {
		lines.push(`Статус: «${before.status}» → «${after.status}»`);
	}

	const bClient = before.clientId ?? null;
	const aClient = after.clientId ?? null;
	if (bClient !== aClient || clientLabel(before.client, bClient) !== clientLabel(after.client, aClient)) {
		lines.push(`Клиент: ${clientLabel(before.client, bClient)} → ${clientLabel(after.client, aClient)}`);
	}

	const bMan = before.managerId ?? null;
	const aMan = after.managerId ?? null;
	if (bMan !== aMan || managerLabel(before.manager, bMan) !== managerLabel(after.manager, aMan)) {
		lines.push(`Ответственный: ${managerLabel(before.manager, bMan)} → ${managerLabel(after.manager, aMan)}`);
	}

	const bDep = before.departmentId ?? null;
	const aDep = after.departmentId ?? null;
	if (bDep !== aDep || deptLabel(before.department, bDep) !== deptLabel(after.department, aDep)) {
		lines.push(`Отдел заказа: ${deptLabel(before.department, bDep)} → ${deptLabel(after.department, aDep)}`);
	}

	if (disp(before.contactName) !== disp(after.contactName)) {
		lines.push(`Имя (лид): ${disp(before.contactName)} → ${disp(after.contactName)}`);
	}
	if (disp(before.contactPhone) !== disp(after.contactPhone)) {
		lines.push(`Телефон (лид): ${disp(before.contactPhone)} → ${disp(after.contactPhone)}`);
	}

	if (dispDate(before.finalDeliveryDate) !== dispDate(after.finalDeliveryDate)) {
		lines.push(`Дата финальной поставки клиенту: ${dispDate(before.finalDeliveryDate)} → ${dispDate(after.finalDeliveryDate)}`);
	}

	const bBk = before.bookingId ?? null;
	const aBk = after.bookingId ?? null;
	if (bBk !== aBk) {
		lines.push(`Связанная запись: ${bBk ?? "—"} → ${aBk ?? "—"}`);
	}

	const bDel = deliveryLabel(before.bookingDepartment, before.deliveryPickupPoint, before.bookingDepartmentId, before.deliveryPickupPointId);
	const aDel = deliveryLabel(after.bookingDepartment, after.deliveryPickupPoint, after.bookingDepartmentId, after.deliveryPickupPointId);
	if (bDel !== aDel) {
		lines.push(`Адрес доставки: ${bDel} → ${aDel}`);
	}

	if (commentsFingerprint(before.comments) !== commentsFingerprint(after.comments)) {
		lines.push("Комментарии к заказу: набор или текст изменён (см. снапшоты до/после).");
	}

	const bi = before.orderItems ?? [];
	const ai = after.orderItems ?? [];
	const bs = sortItems(bi);
	const as = sortItems(ai);
	const bSig = bs.map(itemLine).join("\n");
	const aSig = as.map(itemLine).join("\n");
	if (bSig !== aSig) {
		lines.push("Позиции заказа (состав / поля):");
		if (bs.length === 0) {
			lines.push("  Было: (пусто)");
		} else {
			lines.push("  Было:");
			for (const it of bs) lines.push(`    • ${itemLine(it)}`);
		}
		if (as.length === 0) {
			lines.push("  Стало: (пусто)");
		} else {
			lines.push("  Стало:");
			for (const it of as) lines.push(`    • ${itemLine(it)}`);
		}
	}

	return lines;
}

export function buildOrderUpdateMessage(before: OrderSnapshotLike | null, after: OrderSnapshotLike): string {
	const lines = buildOrderUpdateDiffLines(before, after);
	if (lines.length === 0) {
		return "Сохранение без изменения отслеживаемых полей.";
	}
	return lines.join("\n");
}
