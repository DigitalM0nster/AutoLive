/** Данные контента подвала (одна запись в БД + ответ API). */

/** Пункт внутри блока контактов: телефон → ссылка tel:, текст → обычная строка */
export type FooterContactItemType = "phone" | "text";

export type FooterContactItem = {
	type: FooterContactItemType;
	value: string;
};

/** Ключ иконки блока (Lucide на сайте; ограниченный список для безопасности) */
export const FOOTER_ICON_KEYS = [
	"mapPin",
	"wrench",
	"phone",
	"building2",
	"shoppingCart",
	"fileText",
	"headphones",
] as const;

export type FooterIconKey = (typeof FOOTER_ICON_KEYS)[number];

export type FooterContactBlock = {
	id: string;
	title: string | null;
	icon: FooterIconKey;
	items: FooterContactItem[];
};

/** Документ в подвале (ссылка на загруженный файл) */
export type FooterDocument = {
	id: string;
	title: string;
	fileUrl: string;
};

export type FooterContentData = {
	id?: number;
	phone: string | null;
	contactBlocks: FooterContactBlock[];
	documents: FooterDocument[];
	copyrightLine: string | null;
};

export function isFooterIconKey(v: string): v is FooterIconKey {
	return (FOOTER_ICON_KEYS as readonly string[]).includes(v);
}

/** Подписи иконок в редакторе подвала */
export const FOOTER_ICON_OPTIONS: { value: FooterIconKey; label: string }[] = [
	{ value: "mapPin", label: "Адрес / карта" },
	{ value: "shoppingCart", label: "Пункт выдачи" },
	{ value: "wrench", label: "Сервис / ремонт" },
	{ value: "phone", label: "Телефон" },
	{ value: "building2", label: "Здание / офис" },
	{ value: "fileText", label: "Документ" },
	{ value: "headphones", label: "Поддержка" },
];

const DEFAULT_ICON: FooterIconKey = "mapPin";

function newBlockId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newDocId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseItems(raw: unknown): FooterContactItem[] {
	if (!Array.isArray(raw)) return [];
	const out: FooterContactItem[] = [];
	for (const el of raw) {
		if (!el || typeof el !== "object") continue;
		const o = el as Record<string, unknown>;
		const type = o.type === "phone" ? "phone" : o.type === "text" ? "text" : null;
		if (!type) continue;
		const value = typeof o.value === "string" ? o.value.trim() : "";
		if (!value) continue;
		out.push({ type, value });
	}
	return out;
}

/** Нормализация и проверка массива блоков из БД или из формы */
export function parseFooterContactBlocks(raw: unknown): FooterContactBlock[] {
	if (!Array.isArray(raw)) return [];
	const out: FooterContactBlock[] = [];
	for (const el of raw) {
		if (!el || typeof el !== "object") continue;
		const o = el as Record<string, unknown>;
		const id = typeof o.id === "string" && o.id.trim() !== "" ? o.id.trim() : newBlockId();
		const titleRaw = o.title;
		let title: string | null = null;
		if (typeof titleRaw === "string" && titleRaw.trim() !== "") title = titleRaw.trim();
		const iconStr = typeof o.icon === "string" ? o.icon : "";
		const icon: FooterIconKey = isFooterIconKey(iconStr) ? iconStr : DEFAULT_ICON;
		const items = parseItems(o.items);
		out.push({ id, title, icon, items });
	}
	return out;
}

export function parseFooterDocuments(raw: unknown): FooterDocument[] {
	if (!Array.isArray(raw)) return [];
	const out: FooterDocument[] = [];
	for (const el of raw) {
		if (!el || typeof el !== "object") continue;
		const o = el as Record<string, unknown>;
		const id = typeof o.id === "string" && o.id.trim() !== "" ? o.id.trim() : newDocId();
		const title = typeof o.title === "string" ? o.title.trim() : "";
		const fileUrl = typeof o.fileUrl === "string" ? o.fileUrl.trim() : "";
		if (!title || !fileUrl) continue;
		out.push({ id, title, fileUrl });
	}
	return out;
}

/** Полный DTO после чтения строки Prisma */
export function footerRowToDto(row: {
	id: number;
	phone: string | null;
	contactBlocks: unknown;
	documents: unknown;
	copyrightLine: string | null;
}): FooterContentData {
	return {
		id: row.id,
		phone: row.phone != null && String(row.phone).trim() !== "" ? String(row.phone).trim() : null,
		contactBlocks: parseFooterContactBlocks(row.contactBlocks),
		documents: parseFooterDocuments(row.documents),
		copyrightLine: row.copyrightLine != null && String(row.copyrightLine).trim() !== "" ? String(row.copyrightLine).trim() : null,
	};
}

/** Дефолты до загрузки API и при отсутствии записи в БД */
export const defaultFooterContentDisplay: FooterContentData = {
	phone: "+7 (961) 692-88-16",
	contactBlocks: [
		{
			id: "default-pickup",
			title: "Пункты выдачи:",
			icon: "shoppingCart",
			items: [
				{ type: "text", value: "пр.Ленина, 126Б" },
				{ type: "text", value: "ул.40 домиков, 3" },
			],
		},
		{
			id: "default-service",
			title: "Адреса сервисов:",
			icon: "wrench",
			items: [
				{ type: "text", value: "пр.Ленина, 126Б" },
				{ type: "text", value: "ул.40 домиков, 3" },
			],
		},
	],
	documents: [],
	copyrightLine: "Все права защищены © {{year}}",
};

/**
 * Текст копирайта в подвале: плейсхолдер {{year}} заменяется на текущий год.
 */
export function formatFooterCopyrightLine(template: string | null | undefined): string {
	const year = new Date().getFullYear();
	const base = template != null && template.trim() !== "" ? template.trim() : "Все права защищены © {{year}}";
	return base.replace(/\{\{year\}\}/gi, String(year));
}

/** Ссылка tel: из отображаемого номера (цифры, ведущая 8 → +7). */
export function footerPhoneToTelHref(phone: string): string {
	const d = phone.replace(/\D/g, "");
	if (!d) return "#";
	if (d.length === 11 && d.startsWith("8")) return `tel:+7${d.slice(1)}`;
	if (d.length === 11 && d.startsWith("7")) return `tel:+${d}`;
	if (d.length === 10) return `tel:+7${d}`;
	return `tel:+${d}`;
}

/** Блок показываем, если есть заголовок или хотя бы один непустой пункт */
export function footerBlockIsVisible(block: FooterContactBlock): boolean {
	const hasTitle = Boolean(block.title && block.title.trim() !== "");
	const hasItems = block.items.some((i) => i.value.trim() !== "");
	return hasTitle || hasItems;
}

/** Новый пустой блок в форме редактора */
export function createEmptyFooterContactBlock(): FooterContactBlock {
	return { id: newBlockId(), title: null, icon: DEFAULT_ICON, items: [] };
}

export function createEmptyFooterContactItem(): FooterContactItem {
	return { type: "text", value: "" };
}

/** Черновик строки документа (пустые поля допустимы до сохранения) */
export function createEmptyFooterDocument(): FooterDocument {
	return { id: newDocId(), title: "", fileUrl: "" };
}
