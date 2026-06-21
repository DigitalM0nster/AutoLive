"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "../AdminDashboard.module.scss";

type PayloadRow = {
	partType: string;
	value?: string;
};

type FeedItem = {
	id: string;
	href: string;
	kind: "order" | "request" | "booking";
	title: string;
	meta: string;
	sortTs: number;
};

type Props = {
	ordersCounts: { unassignedCount: number; departmentCount: number } | null;
	homepageNewCount: number | null;
};

function getLocalDateISO(date = new Date()) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function phoneFromPayload(payload: unknown): string {
	if (!Array.isArray(payload)) return "";
	const phone = (payload as PayloadRow[]).find((p) => p.partType === "phone" && p.value?.trim());
	return phone?.value?.trim() || "";
}

function formatBookingDate(dateStr: string, timeStr: string) {
	const d = new Date(`${dateStr}T${timeStr || "00:00"}`);
	if (Number.isNaN(d.getTime())) return `${dateStr} ${timeStr}`.trim();
	return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function kindLabel(kind: FeedItem["kind"]) {
	if (kind === "order") return "Заказ";
	if (kind === "request") return "Заявка";
	return "Запись";
}

export default function DashboardSidebar({ ordersCounts, homepageNewCount }: Props) {
	const [feedLoading, setFeedLoading] = useState(true);
	const [bookingsToday, setBookingsToday] = useState(0);
	const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [isCompactLayout, setIsCompactLayout] = useState(false);

	const newOrdersTotal = ordersCounts ? ordersCounts.unassignedCount + ordersCounts.departmentCount : null;

	useEffect(() => {
		const media = window.matchMedia("(max-width: 1100px)");

		const syncLayout = () => {
			const compact = media.matches;
			setIsCompactLayout(compact);
			if (!compact) setMobileOpen(false);
		};

		syncLayout();
		media.addEventListener("change", syncLayout);
		return () => media.removeEventListener("change", syncLayout);
	}, []);

	useEffect(() => {
		let cancelled = false;

		(async () => {
			setFeedLoading(true);
			const today = getLocalDateISO();
			const items: FeedItem[] = [];

			try {
				const [ordersRes, requestsRes, bookingsRes] = await Promise.all([
					fetch("/api/orders?status=created&limit=4&page=1", { credentials: "include" }),
					fetch("/api/homepage-requests?status=new&limit=4&page=1", { credentials: "include" }),
					fetch(`/api/bookings?dateFrom=${today}&dateTo=${today}&limit=5&page=1`, { credentials: "include" }),
				]);

				if (ordersRes.ok) {
					const data = await ordersRes.json();
					for (const order of data.orders ?? []) {
						const clientName = [order.client?.last_name, order.client?.first_name].filter(Boolean).join(" ");
						const phone = order.client?.phone || "";
						items.push({
							id: `order-${order.id}`,
							href: `/admin/orders/${order.id}`,
							kind: "order",
							title: `Заказ №${order.id}`,
							meta: clientName || phone || "Новый заказ",
							sortTs: new Date(order.createdAt).getTime(),
						});
					}
				}

				if (requestsRes.ok) {
					const data = await requestsRes.json();
					for (const row of data.requests ?? []) {
						const phone = phoneFromPayload(row.payload);
						items.push({
							id: `request-${row.id}`,
							href: `/admin/homepage-requests/${row.id}`,
							kind: "request",
							title: `Заявка №${row.id}`,
							meta: phone || "С главной страницы",
							sortTs: new Date(row.createdAt).getTime(),
						});
					}
				}

				if (bookingsRes.ok) {
					const data = await bookingsRes.json();
					setBookingsToday(typeof data.total === "number" ? data.total : 0);
					for (const booking of data.bookings ?? []) {
						const clientName = [booking.client?.last_name, booking.client?.first_name].filter(Boolean).join(" ");
						items.push({
							id: `booking-${booking.id}`,
							href: `/admin/bookings/${booking.id}`,
							kind: "booking",
							title: `Запись №${booking.id}`,
							meta: clientName || booking.contactPhone || formatBookingDate(booking.scheduledDate, booking.scheduledTime),
							sortTs: new Date(`${booking.scheduledDate}T${booking.scheduledTime || "00:00"}`).getTime(),
						});
					}
				} else {
					setBookingsToday(0);
				}
			} catch {
				if (!cancelled) {
					setBookingsToday(0);
				}
			}

			if (!cancelled) {
				items.sort((a, b) => b.sortTs - a.sortTs);
				setFeedItems(items.slice(0, 6));
				setFeedLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	const stats = useMemo(
		() => [
			{
				label: "Новые заказы",
				value: newOrdersTotal,
				href: "/admin/orders?status=created",
			},
			{
				label: "Заявки с сайта",
				value: homepageNewCount,
				href: "/admin/homepage-requests?status=new",
			},
			{
				label: "Записи сегодня",
				value: bookingsToday,
				href: `/admin/bookings?dateFrom=${getLocalDateISO()}&dateTo=${getLocalDateISO()}`,
			},
		],
		[newOrdersTotal, homepageNewCount, bookingsToday],
	);

	const sidebarExpanded = !isCompactLayout || mobileOpen;

	const collapsedSummary = useMemo(() => {
		const parts: string[] = [];
		if (newOrdersTotal != null && newOrdersTotal > 0) parts.push(`${newOrdersTotal} заказов`);
		if (homepageNewCount != null && homepageNewCount > 0) parts.push(`${homepageNewCount} заявок`);
		if (bookingsToday > 0) parts.push(`${bookingsToday} записей`);
		return parts.length > 0 ? parts.join(" · ") : "Нет срочных задач";
	}, [newOrdersTotal, homepageNewCount, bookingsToday]);

	return (
		<aside className={styles.dashboardSidebar} aria-label="Сводка и задачи">
			<button
				type="button"
				className={[styles.sidebarMobileToggle, sidebarExpanded ? styles.isOpen : ""].filter(Boolean).join(" ")}
				onClick={() => setMobileOpen((open) => !open)}
				aria-expanded={sidebarExpanded}
				aria-controls="dashboard-sidebar-panels"
			>
				<span className={styles.sidebarMobileToggleText}>
					<span className={styles.sidebarMobileToggleTitle}>Быстрая сводка</span>
					{!sidebarExpanded ? <span className={styles.sidebarMobileToggleHint}>{collapsedSummary}</span> : null}
				</span>
				<span className={[styles.sidebarToggleChevron, sidebarExpanded ? styles.isOpen : ""].filter(Boolean).join(" ")} aria-hidden="true" />
			</button>

			<div
				id="dashboard-sidebar-panels"
				className={[styles.sidebarPanels, sidebarExpanded ? styles.isExpanded : styles.isCollapsed].filter(Boolean).join(" ")}
			>
			<div className={[styles.sidebarPanel, styles.toneSidebarStats].join(" ")}>
				<p className={styles.sidebarLabel}>Сводка</p>
				<div className={styles.statsList}>
					{stats.map((stat) => (
						<Link key={stat.label} href={stat.href} className={styles.statRow}>
							<span className={styles.statName}>{stat.label}</span>
							<span className={styles.statValue}>{stat.value == null ? "—" : stat.value}</span>
						</Link>
					))}
				</div>
			</div>

			<div className={[styles.sidebarPanel, styles.toneSidebarFeed].join(" ")}>
				<div className={styles.feedHeader}>
					<p className={styles.sidebarLabel}>Требуют внимания</p>
					<Link href="/admin/orders?status=created" className={styles.feedAllLink}>
						Все задачи
					</Link>
				</div>

				{feedLoading ? (
					<p className={styles.sidebarEmpty}>Загрузка…</p>
				) : feedItems.length === 0 ? (
					<p className={styles.sidebarEmpty}>Нет срочных задач — всё обработано</p>
				) : (
					<ul className={styles.feedList}>
						{feedItems.map((item) => (
							<li key={item.id}>
								<Link href={item.href} className={styles.feedItem}>
									<span className={styles.feedKind}>{kindLabel(item.kind)}</span>
									<span className={styles.feedTitle}>{item.title}</span>
									<span className={styles.feedMeta}>{item.meta}</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className={[styles.sidebarPanel, styles.toneSidebarQuick].join(" ")}>
				<p className={styles.sidebarLabel}>Быстрые ссылки</p>
				<div className={styles.quickLinks}>
					<Link href="/admin/orders/create" className={styles.quickLink}>
						Создать заказ
					</Link>
					<Link href="/admin/bookings/create" className={styles.quickLink}>
						Новая запись
					</Link>
					<Link href="/admin/product-management/products" className={styles.quickLink}>
						Каталог товаров
					</Link>
					<Link href="/" className={styles.quickLink}>
						Открыть сайт
					</Link>
				</div>
			</div>
			</div>
		</aside>
	);
}
