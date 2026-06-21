export type SitePageOption = {
	path: string;
	label: string;
	group: string;
};

/** Статические страницы сайта для выбора в админке */
export const STATIC_SITE_PAGES: SitePageOption[] = [
	{ path: "/", label: "Главная", group: "Сайт" },
	{ path: "/promotions", label: "Акции", group: "Сайт" },
	{ path: "/categories", label: "Материалы для ТО", group: "Каталог" },
	{ path: "/service-kits", label: "Комплекты ТО", group: "Каталог" },
	{ path: "/products", label: "Запчасти", group: "Каталог" },
	{ path: "/booking", label: "Запись на ТО", group: "Сервис" },
	{ path: "/contacts", label: "Контакты", group: "Сайт" },
	{ path: "/cart", label: "Корзина", group: "Сайт" },
];

export function getSitePageLabel(path: string): string {
	const normalized = path.trim() || "/";
	const found = STATIC_SITE_PAGES.find((p) => p.path === normalized);
	return found?.label ?? normalized;
}

export function filterSitePages(items: SitePageOption[], query: string): SitePageOption[] {
	const q = query.trim().toLowerCase();
	if (!q) return items;
	return items.filter((item) => item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q));
}
