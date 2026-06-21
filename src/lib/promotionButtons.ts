import { isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phoneUtils";

export type PromotionButtonType = "phone" | "link" | "internal" | "request";

export type PromotionButton = {
	id: string;
	type: PromotionButtonType;
	label: string;
	href?: string | null;
	openInNewTab?: boolean;
	internalPath?: string | null;
};

export const PROMOTION_BUTTONS_MAX = 2;

const DEFAULT_LABELS: Record<PromotionButtonType, string> = {
	phone: "",
	link: "Подробнее",
	internal: "Перейти",
	request: "Оставить заявку",
};

function normalizeLabel(value: unknown, type: PromotionButtonType): string {
	const label = typeof value === "string" ? value.trim() : "";
	if (type === "phone") {
		return normalizePhoneDigits(label);
	}
	return label || DEFAULT_LABELS[type];
}

function createButtonId(index: number): string {
	return `btn-${index + 1}-${Date.now().toString(36)}`;
}

export function createEmptyPromotionButton(type: PromotionButtonType, index = 0): PromotionButton {
	return {
		id: createButtonId(index),
		type,
		label: DEFAULT_LABELS[type],
		href: type === "link" ? "" : null,
		openInNewTab: false,
		internalPath: type === "internal" ? "" : null,
	};
}

export function parsePromotionButtons(raw: string | null | undefined): PromotionButton[] {
	if (!raw?.trim()) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		const buttons: PromotionButton[] = [];
		for (const row of parsed.slice(0, PROMOTION_BUTTONS_MAX)) {
			if (!row || typeof row !== "object") continue;
			const o = row as Record<string, unknown>;
			const type = o.type;
			if (type !== "phone" && type !== "link" && type !== "internal" && type !== "request") continue;
			const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : createButtonId(buttons.length);
			const button: PromotionButton = {
				id,
				type,
				label: normalizeLabel(o.label, type),
			};
			if (type === "link") {
				button.href = typeof o.href === "string" ? o.href.trim() : "";
				button.openInNewTab = Boolean(o.openInNewTab);
			}
			if (type === "internal") {
				button.internalPath = typeof o.internalPath === "string" ? o.internalPath.trim() : "";
				button.openInNewTab = Boolean(o.openInNewTab);
			}
			buttons.push(button);
		}
		return buttons;
	} catch {
		return [];
	}
}

export function serializePromotionButtons(buttons: PromotionButton[]): string | null {
	const normalized = buttons
		.slice(0, PROMOTION_BUTTONS_MAX)
		.map((button, index) => {
			const base = {
				id: button.id || createButtonId(index),
				type: button.type,
				label: normalizeLabel(button.label, button.type),
			};
			if (button.type === "link") {
				return {
					...base,
					href: (button.href ?? "").trim(),
					openInNewTab: Boolean(button.openInNewTab),
				};
			}
			if (button.type === "internal") {
				return {
					...base,
					internalPath: (button.internalPath ?? "").trim(),
					openInNewTab: Boolean(button.openInNewTab),
				};
			}
			return base;
		})
		.filter((button) => {
			if (button.type === "link") return Boolean(button.href);
			if (button.type === "internal") return Boolean(button.internalPath);
			if (button.type === "phone") return isValidPhoneDigits(button.label);
			return true;
		});

	return normalized.length > 0 ? JSON.stringify(normalized) : null;
}

export function validatePromotionButtons(buttons: PromotionButton[]): string | null {
	if (buttons.length > PROMOTION_BUTTONS_MAX) {
		return `Максимум ${PROMOTION_BUTTONS_MAX} кнопки на акцию`;
	}
	for (const button of buttons) {
		if (button.type === "phone") {
			if (!isValidPhoneDigits(button.label)) {
				return "Укажите полный номер телефона для кнопки";
			}
			continue;
		}
		if (!normalizeLabel(button.label, button.type)) {
			return "У каждой кнопки должен быть текст";
		}
		if (button.type === "link") {
			const href = (button.href ?? "").trim();
			if (!href) return "Укажите ссылку для кнопки";
			if (!/^https?:\/\//i.test(href) && !href.startsWith("/") && !href.startsWith("tel:") && !href.startsWith("mailto:")) {
				return "Ссылка должна начинаться с http://, https:// или /";
			}
		}
		if (button.type === "internal" && !(button.internalPath ?? "").trim()) {
			return "Выберите страницу сайта для кнопки";
		}
	}
	return null;
}

export type PromotionButtonResolved = PromotionButton & {
	resolvedHref?: string | null;
};

export function resolvePromotionButtonHref(button: PromotionButton): string | null {
	if (button.type === "link") {
		const href = (button.href ?? "").trim();
		return href || null;
	}
	if (button.type === "internal") {
		const path = (button.internalPath ?? "").trim();
		return path || null;
	}
	return null;
}

export function readPromotionButtonsFromBody(body: Record<string, unknown>): PromotionButton[] {
	if (Array.isArray(body.buttons)) {
		return parsePromotionButtons(JSON.stringify(body.buttons));
	}
	if (typeof body.buttonsJson === "string") {
		return parsePromotionButtons(body.buttonsJson);
	}
	return [];
}
