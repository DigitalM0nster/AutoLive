// src/lib/adminRoutesMeta.ts

import { Building2, LucideIcon, Users, ShoppingCart, Wrench, FileText, Package, ClipboardList, ListOrdered } from "lucide-react";

export type AdminRouteMeta = {
	label: string;
	icon?: LucideIcon;
	description?: string;
	bg?: string;
};

export const adminRoutesMeta: Record<string, AdminRouteMeta> = {
	departments: {
		label: "Отделы",
		icon: Building2,
		bg: "blue",
	},
	users: {
		label: "Пользователи",
		icon: Users,
		bg: "blue",
	},
	categories: {
		label: "Категории",
		icon: ListOrdered,
		bg: "blue",
	},
	"product-management": {
		label: "Управление товарами",
		icon: Package,
		description: "Товары, Комплекты ТО",
		bg: "green",
	},
	bookings: {
		label: "Записи",
		icon: ClipboardList,
		bg: "green",
	},
	orders: {
		label: "Заказы",
		icon: ShoppingCart,
		bg: "green",
	},
	content: {
		label: "Контент сайта",
		icon: FileText,
		bg: "orange",
	},

	profile: { label: "Редактирование профиля" },
	products: { label: "Список товаров" },
	kits: { label: "Комплекты ТО" },
	clients: { label: "Клиенты" },
	managers: { label: "Менеджеры" },
	homepage: { label: "Главная" },
	contacts: { label: "Контакты" },
	promotions: { label: "Акции" },
	edit: { label: "Редактирование" },
	create: { label: "Создание" },
	admin: { label: "Админ-панель" },
	logs: { label: "История изменений" },
	import: { label: "Импорт товаров" },
};
