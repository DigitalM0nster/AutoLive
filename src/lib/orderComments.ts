/**
 * Комментарии к заказу: хранятся в БД как JSON-массив.
 * Автор и снепшот выставляются на сервере при сохранении; клиент передаёт только id и text.
 */

export type OrderCommentAuthorSnapshot = {
	id: number;
	first_name: string | null;
	last_name: string | null;
	middle_name?: string | null;
	phone?: string | null;
	role: string;
	department?: { id: number; name: string } | null;
};

export type OrderCommentEntry = {
	id: string;
	text: string;
	authorId: number | null;
	authorSnapshot: OrderCommentAuthorSnapshot | null;
	createdAt: string;
};

/** То, что уходит с клиента и приходит в Create/UpdateOrderRequest */
export type OrderCommentWire = {
	id: string;
	text: string;
};

type FullUserForComment = {
	id: number;
	first_name: string | null;
	last_name: string | null;
	middle_name: string | null;
	phone: string;
	role: string;
	department: { id: number; name: string } | null;
};

function newId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `c_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function buildCommentAuthorSnapshotFromUser(user: FullUserForComment): OrderCommentAuthorSnapshot {
	return {
		id: user.id,
		first_name: user.first_name,
		last_name: user.last_name,
		middle_name: user.middle_name,
		phone: user.phone,
		role: user.role,
		department: user.department ? { id: user.department.id, name: user.department.name } : null,
	};
}

function makeNewComment(text: string, authorId: number, snap: OrderCommentAuthorSnapshot, clientId?: string): OrderCommentEntry {
	const id = clientId && clientId.length > 0 ? clientId : newId();
	return {
		id,
		text,
		authorId,
		authorSnapshot: snap,
		createdAt: new Date().toISOString(),
	};
}

function normalizeCommentObject(item: unknown): OrderCommentEntry | null {
	if (!item || typeof item !== "object" || Array.isArray(item)) return null;
	const o = item as Record<string, unknown>;
	const text = typeof o.text === "string" ? o.text.trim() : "";
	if (!text) return null;
	const id = typeof o.id === "string" && o.id.length > 0 ? o.id : newId();
	let authorId: number | null = null;
	if (typeof o.authorId === "number" && Number.isFinite(o.authorId)) {
		authorId = o.authorId;
	}
	let authorSnapshot: OrderCommentAuthorSnapshot | null = null;
	if (o.authorSnapshot && typeof o.authorSnapshot === "object" && !Array.isArray(o.authorSnapshot)) {
		const s = o.authorSnapshot as Record<string, unknown>;
		const sid = typeof s.id === "number" ? s.id : null;
		if (sid != null) {
			authorSnapshot = {
				id: sid,
				first_name: typeof s.first_name === "string" ? s.first_name : null,
				last_name: typeof s.last_name === "string" ? s.last_name : null,
				middle_name: typeof s.middle_name === "string" ? s.middle_name : null,
				phone: typeof s.phone === "string" ? s.phone : null,
				role: typeof s.role === "string" ? s.role : "",
				department:
					s.department && typeof s.department === "object" && !Array.isArray(s.department)
						? (() => {
								const did = Number((s.department as { id?: unknown }).id);
								if (!Number.isFinite(did)) return null;
								return {
									id: did,
									name: String((s.department as { name?: unknown }).name ?? ""),
								};
							})()
						: null,
			};
		}
	}
	const createdAt =
		typeof o.createdAt === "string" && o.createdAt.length > 0 ? o.createdAt : new Date().toISOString();
	return { id, text, authorId, authorSnapshot, createdAt };
}

/**
 * Приводит значение из БД к массиву комментариев (поддержка legacy: массив строк).
 */
export function parseOrderCommentsFromDb(raw: unknown): OrderCommentEntry[] {
	if (raw == null) return [];
	if (!Array.isArray(raw)) return [];
	if (raw.length === 0) return [];
	if (typeof raw[0] === "string") {
		const now = new Date().toISOString();
		return (raw as string[])
			.map((t) => (typeof t === "string" ? t.trim() : ""))
			.filter(Boolean)
			.map((text) => ({
				id: newId(),
				text,
				authorId: null,
				authorSnapshot: null,
				createdAt: now,
			}));
	}
	const out: OrderCommentEntry[] = [];
	for (const el of raw) {
		const n = normalizeCommentObject(el);
		if (n) out.push(n);
	}
	return out;
}

export function getOrderCommentsCount(raw: unknown): number {
	return parseOrderCommentsFromDb(raw).length;
}

export function toCommentWires(entries: OrderCommentEntry[]): OrderCommentWire[] {
	return entries.map((c) => ({ id: c.id, text: c.text }));
}

/** Создание заказа: все элементы считаются новыми, автор — текущий пользователь. */
export function mergeOrderCommentsOnCreate(
	incoming: OrderCommentWire[] | undefined,
	fullUser: FullUserForComment
): OrderCommentEntry[] {
	if (!incoming?.length) return [];
	const snap = buildCommentAuthorSnapshotFromUser(fullUser);
	const out: OrderCommentEntry[] = [];
	for (const inc of incoming) {
		const text = (inc.text ?? "").trim();
		if (!text) continue;
		const id = (inc.id ?? "").trim();
		out.push(makeNewComment(text, fullUser.id, snap, id || undefined));
	}
	return out;
}

/**
 * Обновление: суперадмин задаёт итоговый список (включая удаления).
 * Админ/менеджер не может удалить чужие комментарии — сервер сохраняет прежние и только добавляет новые по id.
 */
export function mergeOrderCommentsOnUpdate(
	previousRaw: unknown,
	incoming: OrderCommentWire[] | undefined,
	role: string,
	fullUser: FullUserForComment
): OrderCommentEntry[] {
	const prev = parseOrderCommentsFromDb(previousRaw);
	const prevMap = new Map(prev.map((c) => [c.id, c]));
	const prevIds = new Set(prev.map((c) => c.id));
	const snap = buildCommentAuthorSnapshotFromUser(fullUser);

	if (incoming === undefined) {
		return prev;
	}

	if (role === "superadmin") {
		const out: OrderCommentEntry[] = [];
		for (const inc of incoming) {
			const id = (inc.id ?? "").trim();
			const text = (inc.text ?? "").trim();
			if (id && prevMap.has(id)) {
				out.push({ ...prevMap.get(id)! });
				continue;
			}
			if (!text) continue;
			out.push(makeNewComment(text, fullUser.id, snap, id || undefined));
		}
		return out;
	}

	const out = [...prev];
	for (const inc of incoming) {
		const id = (inc.id ?? "").trim();
		const text = (inc.text ?? "").trim();
		if (!id || prevIds.has(id)) continue;
		if (!text) continue;
		out.push(makeNewComment(text, fullUser.id, snap, id));
		prevIds.add(id);
	}
	return out;
}
