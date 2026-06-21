// Навигация шапки — группы по смыслу, как на дашборде

import { Role } from "@/lib/rolesConfig";
import { adminRoutesMeta } from "@/lib/adminRoutesMeta";

export type AdminNavItem = {
	key: string;
	label: string;
	href: string;
	prefixes: string[];
};

export type AdminNavGroup = {
	id: string;
	label: string;
	toneClass: string;
	items: AdminNavItem[];
};

type NavGroupDef = {
	id: string;
	label: string;
	toneClass: string;
	keys: { key: string; roles?: Role[] }[];
	superadminOnly?: boolean;
};

const ADMIN_NAV_GROUPS: NavGroupDef[] = [
	{
		id: "operations",
		label: "Ежедневно",
		toneClass: "toneOperations",
		keys: [{ key: "orders" }, { key: "bookings" }, { key: "homepage-requests" }],
	},
	{
		id: "catalog",
		label: "Каталог",
		toneClass: "toneCatalog",
		keys: [{ key: "products" }, { key: "kits" }, { key: "categories" }],
	},
	{
		id: "locations",
		label: "Адреса",
		toneClass: "toneLocations",
		keys: [{ key: "booking-departments" }, { key: "pickup-points" }],
	},
	{
		id: "team",
		label: "Команда",
		toneClass: "toneTeam",
		keys: [{ key: "users" }, { key: "departments" }],
	},
	{
		id: "site",
		label: "Сайт",
		toneClass: "toneSite",
		keys: [
			{ key: "settings" },
			{ key: "homepage" },
			{ key: "site-feedback-form" },
			{ key: "contacts" },
			{ key: "legal-documents" },
			{ key: "footer" },
			{ key: "promotions" },
		],
		superadminOnly: true,
	},
];

export const ADMIN_DASHBOARD_NAV: AdminNavItem = {
	key: "_dashboard",
	label: "Панель",
	href: "/admin/dashboard",
	prefixes: ["/admin/dashboard"],
};

function hrefForKey(key: string): string {
	const meta = adminRoutesMeta[key];
	return meta?.href ?? `/admin/${key}`;
}

function labelForKey(key: string): string {
	return adminRoutesMeta[key]?.label ?? key;
}

function prefixesForKey(_key: string, href: string): string[] {
	return [href.split("?")[0]];
}

function buildNavItem(key: string): AdminNavItem {
	const href = hrefForKey(key);
	return {
		key,
		label: labelForKey(key),
		href,
		prefixes: prefixesForKey(key, href),
	};
}

export function getAdminNavGroups(role?: Role | null): AdminNavGroup[] {
	return ADMIN_NAV_GROUPS.filter((group) => !group.superadminOnly || role === "superadmin")
		.map((group) => ({
			id: group.id,
			label: group.label,
			toneClass: group.toneClass,
			items: group.keys.filter((item) => !item.roles || (role && item.roles.includes(role))).map((item) => buildNavItem(item.key)),
		}))
		.filter((group) => group.items.length > 0);
}

export function isAdminNavActive(pathname: string, item: AdminNavItem): boolean {
	if (item.prefixes.includes("/admin/dashboard")) {
		return pathname === "/admin/dashboard";
	}

	return item.prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isAdminNavGroupActive(pathname: string, group: AdminNavGroup): boolean {
	return group.items.some((item) => isAdminNavActive(pathname, item));
}
