"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { bookingStatusLabelRu, orderStatusLabelRu } from "@/lib/profileDisplayLabels";
import { formatDateTime, formatMoney } from "./profileUiUtils";
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

function displayName(u: UserRow): string {
	const parts = [u.last_name, u.first_name, u.middle_name].filter(Boolean);
	return parts.length ? parts.join(" ") : "Клиент";
}

export default function ProfileHome() {
	const [profile, setProfile] = useState<UserRow | null>(null);
	const [orders, setOrders] = useState<OrderRow[]>([]);
	const [bookings, setBookings] = useState<BookingRow[]>([]);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const [uRes, oRes, bRes] = await Promise.all([
				fetch("/api/user/get-user-data", { credentials: "include" }),
				fetch("/api/user/profile/orders", { credentials: "include" }),
				fetch("/api/user/profile/bookings", { credentials: "include" }),
			]);
			if (!uRes.ok) return;
			const u = (await uRes.json()) as UserRow;
			if (u.role !== "client") return;
			setProfile(u);
			if (oRes.ok) setOrders(await oRes.json());
			if (bRes.ok) setBookings(await bRes.json());
		} catch {
			setError("Не удалось загрузить данные.");
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	if (!profile) {
		return <p className={styles.redirectNote}>Загрузка…</p>;
	}

	const recentOrders = orders.slice(0, 4);
	const recentBookings = bookings.slice(0, 3);

	return (
		<>
			<h1 className={styles.pageTitle}>Личный кабинет</h1>
			{error && <div className={styles.errorBanner}>{error}</div>}

			<div className={styles.card}>
				<div className={styles.welcomeTitle}>Здравствуйте, {displayName(profile)}</div>
				<div className={styles.phoneLine}>
					Телефон для входа: <strong>{profile.phone}</strong>
				</div>
				<div className={styles.welcomeHint}>Номер не меняется: он используется как логин.</div>
				{profile.status === "verified" ?
					<span className={styles.statusBadge}>Аккаунт подтверждён</span>
				:	<span className={styles.statusBadge}>Аккаунт не подтверждён</span>}
			</div>

			<div className={styles.quickLinks}>
				<Link href="/cart" className={styles.quickLink}>
					Корзина
				</Link>
				<Link href="/booking" className={styles.quickLink}>
					Запись на ТО
				</Link>
				<Link href="/catalog" className={styles.quickLink}>
					Запчасти
				</Link>
				<Link href="/contacts" className={styles.quickLink}>
					Контакты
				</Link>
				<Link href="/profile/settings" className={styles.quickLink}>
					Настройки профиля
				</Link>
			</div>

			<p className={styles.muted}>
				Если вы оформляете заказ или запись, будучи авторизованы, они автоматически появятся в списках ниже.
			</p>

			<section className={styles.section}>
				<div className={styles.rowBetween}>
					<h2 className={styles.subTitle}>Последние заказы</h2>
					{orders.length > 4 && (
						<Link href="/profile/orders" className={styles.backLink}>
							Все заказы
						</Link>
					)}
				</div>
				{recentOrders.length === 0 ?
					<div className={styles.emptyState}>
						Пока нет заказов. <Link href="/catalog">Перейти в каталог</Link>
					</div>
				:	recentOrders.map((o) => (
						<Link key={o.id} href={`/profile/orders/${o.id}`} className={styles.orderListCard}>
							<div className={styles.rowBetween}>
								<div className={styles.orderId}>Заказ №{o.id}</div>
								<div className={styles.orderStatus}>{orderStatusLabelRu(o.status)}</div>
							</div>
							<div className={styles.orderMeta}>
								{formatDateTime(o.createdAt)} · {o.itemsCount} поз. · {formatMoney(o.total)}
							</div>
							{o.previewTitles.length > 0 && <div className={styles.orderPreview}>{o.previewTitles.join(" · ")}</div>}
							<div className={styles.linkDetail}>Подробнее</div>
						</Link>
					))
				}
			</section>

			<section className={styles.section}>
				<div className={styles.rowBetween}>
					<h2 className={styles.subTitle}>Записи на ТО</h2>
					{bookings.length > 3 && (
						<Link href="/profile/bookings" className={styles.backLink}>
							Все записи
						</Link>
					)}
				</div>
				{recentBookings.length === 0 ?
					<div className={styles.emptyState}>
						Нет записей. <Link href="/booking">Записаться</Link>
					</div>
				:	recentBookings.map((b) => (
						<Link key={b.id} href={`/profile/bookings/${b.id}`} className={styles.orderListCard}>
							<div className={styles.rowBetween}>
								<div className={styles.orderId}>
									Запись №{b.id} · {bookingStatusLabelRu(b.status)}
								</div>
							</div>
							<div className={styles.bookingRow}>
								{b.scheduledDate} в {b.scheduledTime}
							</div>
							<div className={styles.bookingRow}>
								{b.departmentName ? `${b.departmentName}, ` : ""}
								{b.departmentAddress}
							</div>
							<div className={styles.linkDetail}>Подробнее</div>
						</Link>
					))
				}
			</section>
		</>
	);
}
