// src/lib/adminRoutesMeta.ts

import {
	Building2,
	ClipboardList,
	FileText,
	Globe,
	Home,
	ListOrdered,
	LucideIcon,
	MapPin,
	Package,
	PackageCheck,
	PanelBottom,
	Percent,
	Settings,
	ShoppingCart,
	Users,
	Wrench,
} from "lucide-react";

export type AdminRouteMeta = {
	label: string;
	icon?: LucideIcon;
	description?: string;
	bg?: string;
	/** Если задан, карточка на дашборде ведёт сюда вместо `/admin/{ключ}` */
	href?: string;
};

export const adminRoutesMeta: Record<string, AdminRouteMeta> = {
	departments: {
		label: "Отделы",
		icon: Building2,
		description: "Структура магазина и привязка сотрудников",
		bg: "green",
	},
	users: {
		label: "Пользователи",
		icon: Users,
		description: "Клиенты, менеджеры и администраторы",
		bg: "green",
	},
	categories: {
		label: "Категории",
		icon: ListOrdered,
		description: "Разделы каталога на сайте",
		bg: "blue",
	},
	products: {
		label: "Товары",
		icon: Package,
		description: "Добавление и редактирование товаров",
		href: "/admin/product-management/products",
		bg: "blue",
	},
	kits: {
		label: "Комплекты ТО",
		icon: Wrench,
		description: "Сборка наборов ТО из товаров",
		href: "/admin/product-management/kits",
		bg: "blue",
	},
	bookings: {
		label: "Записи",
		icon: ClipboardList,
		bg: "purple",
	},
	"booking-departments": {
		label: "Адреса для записей",
		icon: MapPin,
		description: "Отделы с адресами для записей",
		bg: "purple",
	},
	"pickup-points": {
		label: "Пункты выдачи",
		icon: PackageCheck,
		description: "Адреса пунктов выдачи",
		bg: "purple",
	},
	orders: {
		label: "Заказы",
		icon: ShoppingCart,
		bg: "blue",
	},
	"homepage-requests": {
		label: "Заявки с сайта",
		icon: Globe,
		description: "Заявки с главной страницы и акций",
		bg: "red",
		href: "/admin/homepage-requests",
	},
	"site-feedback-form": {
		label: "Форма обратной связи",
		icon: ClipboardList,
		description: "Поля и кнопка формы «Оставить заявку»",
		bg: "red",
		href: "/admin/site-feedback-form",
	},
	settings: {
		label: "Основные настройки",
		icon: Settings,
		description: "Логотип, фавиконка, основные цвета сайта",
		href: "/admin/content/settings",
		bg: "red",
	},
	homepage: {
		label: "Главная страница",
		icon: Home,
		description: "Тексты и блоки на главной (без формы заявки)",
		href: "/admin/content/homepage",
		bg: "red",
	},
	contacts: {
		label: "Контакты",
		icon: MapPin,
		description: "Страница контактов на сайте",
		href: "/admin/content/contacts",
		bg: "red",
	},
	"legal-documents": {
		label: "Юридические документы",
		icon: FileText,
		description: "Политики для страниц /privacy и /cookies",
		href: "/admin/content/legal-documents",
		bg: "red",
	},
	footer: {
		label: "Подвал",
		icon: PanelBottom,
		description: "Контакты в подвале и строка копирайта",
		href: "/admin/content/footer",
		bg: "red",
	},
	promotions: {
		label: "Акции",
		icon: Percent,
		description: "Раздел акций на сайте",
		href: "/admin/content/promotions",
		bg: "red",
	},

	// Только для хлебных крошек (промежуточные сегменты URL)
	"product-management": { label: "Управление товарами" },
	content: { label: "Контент сайта" },

	profile: { label: "Редактирование профиля" },
	clients: { label: "Клиенты" },
	managers: { label: "Менеджеры" },
	edit: { label: "Редактирование" },
	create: { label: "Создание" },
	admin: { label: "Админ-панель" },
	logs: { label: "История изменений" },
	import: { label: "Импорт товаров" },
};
