export type SiteFormRequestSourceType = "homepage" | "promotion" | "contacts";

export type SiteFormRequestSource = {
	type: SiteFormRequestSourceType;
	label: string;
	promotionId?: number | null;
};

export const HOMEPAGE_REQUEST_SOURCE_LABEL = "Главная страница";
export const CONTACTS_REQUEST_SOURCE_LABEL = "Контакты";

export function formatSiteFormRequestSource(sourceType: SiteFormRequestSourceType, sourceLabel?: string | null): string {
	if (sourceType === "promotion") {
		const title = sourceLabel?.trim();
		return title ? `Акция: ${title}` : "Акция";
	}
	if (sourceType === "contacts") {
		return sourceLabel?.trim() || CONTACTS_REQUEST_SOURCE_LABEL;
	}
	return sourceLabel?.trim() || HOMEPAGE_REQUEST_SOURCE_LABEL;
}

export function buildPromotionRequestSource(promotionId: number, promotionTitle: string): SiteFormRequestSource {
	return {
		type: "promotion",
		label: promotionTitle.trim(),
		promotionId,
	};
}

export function buildHomepageRequestSource(): SiteFormRequestSource {
	return {
		type: "homepage",
		label: HOMEPAGE_REQUEST_SOURCE_LABEL,
	};
}

export function buildContactsRequestSource(): SiteFormRequestSource {
	return {
		type: "contacts",
		label: CONTACTS_REQUEST_SOURCE_LABEL,
	};
}

export function buildProductRequestSource(productTitle: string): SiteFormRequestSource {
	const title = productTitle.trim();
	return {
		type: "homepage",
		label: title ? `Товар: ${title}` : "Страница товара",
	};
}

/** Заголовок попапа для пользователя — без указания страницы-источника */
export function getOrderPopupHeading(orderButtonText?: string | null): string {
	return orderButtonText?.trim() || "Оставить заявку";
}
