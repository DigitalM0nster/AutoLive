"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { bookingStatusLabelRu, orderStatusLabelRu } from "@/lib/profileDisplayLabels";
import { formatPhoneDisplay } from "@/lib/phoneUtils";
import { displayProfileName, formatDateTime, formatMoney } from "./profileUiUtils";
import { canAccessSiteProfile } from "@/lib/siteProfileAccess";
import styles from "./profileArea.module.scss";

type UserRow = {
	id: number;
	phone: string;
	role: string;
	status: string;
	first_name: string;
	last_name: string;
	middle_name: string;
};

type OrderRow = {
	id: number;
	status: string;
	createdAt: string;
	itemsCount: number;
	total: number;
	previewTitles: string[];
};

type BookingRow = {
	id: number;
	scheduledDate: string;
	scheduledTime: string;
	contactPhone: string;
	status: string;
	notes: string | null;
	createdAt: string;
	departmentName: string | null;
	departmentAddress: string;
};

export default function ProfileHome() {
	const [profile, setProfile] = useState<UserRow | null>(null);
	const [orders, setOrders] = useState<OrderRow[]>([]);
	const [bookings, setBookings] = useState<BookingRow[]>([]);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const [userRes, ordersRes, bookingsRes] = await Promise.all([
				fetch("/api/user/get-user-data", { credentials: "include" }),
				fetch("/api/user/profile/orders", { credentials: "include" }),
				fetch("/api/user/profile/bookings", { credentials: "include" }),
			]);
			if (!userRes.ok) return;
			const user = (await userRes.json()) as UserRow;
			if (!canAccessSiteProfile(user.role)) return;
			setProfile(user);
			if (ordersRes.ok) setOrders(await ordersRes.json());
			if (bookingsRes.ok) setBookings(await bookingsRes.json());
		} catch {
			setError("Не удалось загрузить данные.");
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	if (!profile) {
		return <p className={styles.loadingNote}>Загрузка…</p>;
	}

	const recentOrders = orders.slice(0, 3);
	const recentBookings = bookings.slice(0, 3);

	return (
		<>
			<header className={styles.pageHeader}>
				<h1 className={styles.pageTitle}>Обзор</h1>
				<p className={styles.pageLead}>Здравствуйте, {displayProfileName(profile)}. Здесь — ваши заказы, записи и быстрые действия.</p>
			</header>

			{error ? <div className={styles.errorBanner}>{error}</div> : null}

			<div className={styles.statsGrid}>
				<div className={styles.statCard}>
					<span className={styles.statLabel}>Заказы</span>
					<span className={styles.statValue}>{orders.length}</span>
					<Link href="/profile/orders" className={styles.statLink}>
						Смотреть все
					</Link>
				</div>
				<div className={styles.statCard}>
					<span className={styles.statLabel}>Записи на ТО</span>
					<span className={styles.statValue}>{bookings.length}</span>
					<Link href="/profile/bookings" className={styles.statLink}>
						Смотреть все
					</Link>
				</div>
				<Link href="/cart" className={`${styles.statCard} ${styles.actionCard}`}>
					<span className={styles.statLabel}>Корзина</span>
					<span className={styles.statActionText}>Оформить заказ</span>
				</Link>
			</div>

			<div className={styles.panelCard}>
				<div className={styles.panelHeader}>
					<h2 className={styles.panelTitle}>Аккаунт</h2>
					{profile.status === "verified" ?
						<span className={`${styles.statusBadge} ${styles.verified}`}>Подтверждён</span>
					:	<span className={`${styles.statusBadge} ${styles.pending}`}>Не подтверждён</span>}
				</div>
				<dl className={styles.factsList}>
					<dt>Телефон</dt>
					<dd>{formatPhoneDisplay(profile.phone)}</dd>
					<dt>ФИО</dt>
					<dd>{displayProfileName(profile)}</dd>
				</dl>
				<p className={styles.panelHint}>Номер телефона — ваш логин. Изменить его можно через поддержку магазина.</p>
				<Link href="/profile/settings" className={styles.inlineLink}>
					Редактировать профиль →
				</Link>
			</div>

			<section className={styles.section}>
				<div className={styles.sectionHeader}>
					<h2 className={styles.sectionTitle}>Последние заказы</h2>
					{orders.length > 0 ?
						<Link href="/profile/orders" className={styles.sectionLink}>
							Все заказы
						</Link>
					:	null}
				</div>

				{recentOrders.length === 0 ?
					<div className={styles.emptyState}>
						<p>Пока нет заказов.</p>
						<Link href="/categories" className={styles.emptyAction}>
							Перейти в каталог
						</Link>
					</div>
				:	<div className={styles.listStack}>
						{recentOrders.map((order) => (
							<Link key={order.id} href={`/profile/orders/${order.id}`} className={styles.listCard}>
								<div className={styles.listCardTop}>
									<span className={styles.listCardId}>Заказ №{order.id}</span>
									<span className={styles.statusBadge}>{orderStatusLabelRu(order.status)}</span>
								</div>
								<div className={styles.listCardMeta}>
									{formatDateTime(order.createdAt)} · {order.itemsCount} поз. · {formatMoney(order.total)}
								</div>
								{order.previewTitles.length > 0 ?
									<p className={styles.listCardPreview}>{order.previewTitles.join(" · ")}</p>
								:	null}
							</Link>
						))}
					</div>
				}
			</section>

			<section className={styles.section}>
				<div className={styles.sectionHeader}>
					<h2 className={styles.sectionTitle}>Записи на ТО</h2>
					{bookings.length > 0 ?
						<Link href="/profile/bookings" className={styles.sectionLink}>
							Все записи
						</Link>
					:	null}
				</div>

				{recentBookings.length === 0 ?
					<div className={styles.emptyState}>
						<p>Записей пока нет.</p>
						<Link href="/booking" className={styles.emptyAction}>
							Записаться на ТО
						</Link>
					</div>
				:	<div className={styles.listStack}>
						{recentBookings.map((booking) => (
							<Link key={booking.id} href={`/profile/bookings/${booking.id}`} className={styles.listCard}>
								<div className={styles.listCardTop}>
									<span className={styles.listCardId}>Запись №{booking.id}</span>
									<span className={styles.statusBadge}>{bookingStatusLabelRu(booking.status)}</span>
								</div>
								<div className={styles.listCardMeta}>
									{booking.scheduledDate} в {booking.scheduledTime}
								</div>
								<p className={styles.listCardPreview}>
									{booking.departmentName ? `${booking.departmentName}, ` : ""}
									{booking.departmentAddress}
								</p>
							</Link>
						))}
					</div>
				}
			</section>
		</>
	);
}
