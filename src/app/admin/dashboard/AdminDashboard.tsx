"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LucideIcon } from "lucide-react";
import { Role } from "@/lib/rolesConfig";
import { adminRoutesMeta } from "@/lib/adminRoutesMeta";
import DashboardSidebar from "./local_components/DashboardSidebar";
import styles from "./AdminDashboard.module.scss";

type DashboardItem = {
	routeKey: string;
	href: string;
	label: string;
	description: string;
	icon: LucideIcon;
};

type DashboardGroup = {
	id: string;
	sectionLabel: string;
	sectionTitle: string;
	keys: string[];
	superadminOnly?: boolean;
	toneClass: string;
};

const DASHBOARD_GROUPS: DashboardGroup[] = [
	{
		id: "operations",
		sectionLabel: "Ежедневно",
		sectionTitle: "Заказы и обращения",
		keys: ["orders", "bookings", "homepage-requests"],
		toneClass: "toneOperations",
	},
	{
		id: "catalog",
		sectionLabel: "Каталог",
		sectionTitle: "Товары и категории",
		keys: ["products", "kits", "categories"],
		toneClass: "toneCatalog",
	},
	{
		id: "locations",
		sectionLabel: "Адреса",
		sectionTitle: "Сервис и пункты выдачи",
		keys: ["booking-departments", "pickup-points"],
		toneClass: "toneLocations",
	},
	{
		id: "team",
		sectionLabel: "Команда",
		sectionTitle: "Пользователи и отделы",
		keys: ["users", "departments"],
		toneClass: "toneTeam",
	},
	{
		id: "site",
		sectionLabel: "Сайт",
		sectionTitle: "Контент и оформление",
		keys: ["settings", "homepage", "site-feedback-form", "contacts", "legal-documents", "footer", "promotions"],
		superadminOnly: true,
		toneClass: "toneSite",
	},
];

const FALLBACK_DESCRIPTIONS: Record<string, string> = {
	departments: "Структура магазина и привязка сотрудников",
	users: "Клиенты, менеджеры и администраторы",
	categories: "Разделы каталога на сайте",
	products: "Добавление и редактирование товаров",
	kits: "Сборка наборов ТО из товаров",
	orders: "Новые и текущие заказы клиентов",
	bookings: "Записи на техническое обслуживание",
	"booking-departments": "Адреса сервисов для онлайн-записи",
	"pickup-points": "Где клиенты забирают заказы",
	"homepage-requests": "Заявки с формы на сайте (главная и акции)",
	"site-feedback-form": "Поля формы «Оставить заявку» на сайте",
	settings: "Логотип, фавиконка и цвета",
	homepage: "Тексты и блоки главной страницы (без формы заявки)",
	contacts: "Страница контактов",
	"legal-documents": "Политики конфиденциальности и cookies",
	footer: "Подвал сайта и копирайт",
	promotions: "Акции на сайте",
};

type Props = {
	user: {
		name: string;
		role: Role;
	};
};

function getBadgeCount(routeKey: string, ordersCounts: { unassignedCount: number; departmentCount: number } | null, homepageNewCount: number | null): number | null {
	if (routeKey === "orders" && ordersCounts) {
		const total = ordersCounts.unassignedCount + ordersCounts.departmentCount;
		return total > 0 ? total : null;
	}
	if (routeKey === "homepage-requests" && homepageNewCount != null && homepageNewCount > 0) {
		return homepageNewCount;
	}
	return null;
}

function buildItem(key: string): DashboardItem | null {
	const meta = adminRoutesMeta[key];
	if (!meta?.icon) return null;

	return {
		routeKey: key,
		href: meta.href ?? `/admin/${key}`,
		label: meta.label,
		description: meta.description?.trim() || FALLBACK_DESCRIPTIONS[key] || `Перейти в раздел «${meta.label}»`,
		icon: meta.icon,
	};
}

export default function AdminDashboard({ user }: Props) {
	const [ordersCounts, setOrdersCounts] = useState<{ unassignedCount: number; departmentCount: number } | null>(null);
	const [homepageNewCount, setHomepageNewCount] = useState<number | null>(null);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const res = await fetch("/api/orders/count-new-orders", { credentials: "include" });
				if (!res.ok) return;
				const data = await res.json();
				if (isMounted) setOrdersCounts({ unassignedCount: data.unassignedCount ?? 0, departmentCount: data.departmentCount ?? 0 });
			} catch {}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const res = await fetch("/api/homepage-requests/count-new", { credentials: "include" });
				if (!res.ok) return;
				const data = await res.json();
				if (isMounted) setHomepageNewCount(typeof data.newCount === "number" ? data.newCount : 0);
			} catch {}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	const groups = useMemo(() => {
		return DASHBOARD_GROUPS.filter((group) => !group.superadminOnly || user.role === "superadmin")
			.map((group) => ({
				...group,
				items: group.keys.map(buildItem).filter((item): item is DashboardItem => item !== null),
			}))
			.filter((group) => group.items.length > 0);
	}, [user.role]);

	const displayName = user.name?.trim() || "коллега";

	return (
		<div className={`screenContent ${styles.dashboardPage}`}>
			<header className={styles.dashboardHeader}>
				<p className={styles.dashboardLabel}>Панель управления</p>
				<h1 className={styles.dashboardTitle}>Здравствуйте, {displayName}</h1>
				<p className={styles.dashboardLead}>Разделы сгруппированы по задачам — выберите нужный блок ниже</p>
			</header>

			<div className={styles.dashboardLayout}>
				<div className={styles.dashboardMain}>
					{groups.map((group) => (
						<section
							key={group.id}
							className={[styles.dashboardSection, styles[group.toneClass]].filter(Boolean).join(" ")}
							aria-labelledby={`dashboard-${group.id}-heading`}
						>
							<div className={styles.sectionHeader}>
								<p className={styles.sectionLabel}>{group.sectionLabel}</p>
								<h2 id={`dashboard-${group.id}-heading`} className={styles.sectionTitle}>
									{group.sectionTitle}
								</h2>
							</div>

							<div className={styles.dashboardGrid}>
								{group.items.map(({ routeKey, href, label, description, icon: Icon }) => {
									const badge = getBadgeCount(routeKey, ordersCounts, homepageNewCount);

									return (
										<Link key={href} href={href} className={styles.dashboardCard}>
											{badge != null && (
												<span className={styles.cardBadge} aria-label={`Новых: ${badge}`}>
													{badge > 99 ? "99+" : badge}
												</span>
											)}

											<div className={styles.cardIcon}>
												<Icon size={22} strokeWidth={1.75} aria-hidden />
											</div>

											<div className={styles.cardBody}>
												<div className={styles.cardTitle}>{label}</div>
												<p className={styles.cardDesc}>{description}</p>
											</div>

											<div className={styles.cardFooter}>
												<span className={styles.cardArrow} aria-hidden="true">
													<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
														<path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
														<path d="M9 7H17V15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
													</svg>
												</span>
											</div>
										</Link>
									);
								})}
							</div>
						</section>
					))}
				</div>

				<DashboardSidebar ordersCounts={ordersCounts} homepageNewCount={homepageNewCount} />
			</div>
		</div>
	);
}
