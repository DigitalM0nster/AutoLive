// src/lib/adminRoutesMeta.ts

import { LucideIcon, Users, ShoppingCart, Wrench, FileText, Package } from "lucide-react";

export type AdminRouteMeta = {
	label: string;
	icon?: LucideIcon;
	description?: string;
	bg?: string;
};

export const adminRoutesMeta: Record<string, AdminRouteMeta> = {
	users: {
		label: "Пользователи",
		icon: Users,
		bg: "from-indigo-400 to-indigo-600",
	},
	orders: {
		label: "Заказы",
		icon: ShoppingCart,
		bg: "from-emerald-400 to-emerald-600",
	},
	"service-records": {
		label: "Записи на ТО",
		icon: Wrench,
		bg: "from-yellow-400 to-yellow-600",
	},
	content: {
		label: "Контент сайта",
		icon: FileText,
		bg: "from-pink-400 to-pink-600",
	},
	"product-management": {
		label: "Управление товарами",
		icon: Package,
		description: "Категории, товары, Комплекты ТО",
		bg: "from-sky-400 to-sky-600",
	},
	profile: { label: "Редактирование профиля" },
	categories: { label: "Категории" },
	products: { label: "Товары" },
	kits: { label: "Комплекты ТО" },
	clients: { label: "Клиенты" },
	managers: { label: "Менеджеры" },
	homepage: { label: "Главная" },
	contacts: { label: "Контакты" },
	promotions: { label: "Акции" },
	edit: { label: "Редактирование" },
	create: { label: "Создание" },
	admin: { label: "Админ-панель" },
};
