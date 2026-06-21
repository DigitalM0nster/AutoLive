"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { orderStatusLabelRu } from "@/lib/profileDisplayLabels";
import { formatDateTime, formatMoney } from "./profileUiUtils";
import styles from "./profileArea.module.scss";

type OrderRow = {
	id: number;
	status: string;
	createdAt: string;
	itemsCount: number;
	total: number;
	previewTitles: string[];
};

export default function ProfileOrdersList() {
	const [orders, setOrders] = useState<OrderRow[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/user/profile/orders", { credentials: "include" });
			if (res.ok) setOrders(await res.json());
			else setError("Не удалось загрузить заказы.");
		} catch {
			setError("Не удалось загрузить заказы.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<>
			<header className={styles.pageHeader}>
				<h1 className={styles.pageTitle}>Мои заказы</h1>
				<p className={styles.pageLead}>Заявки, оформленные под вашим аккаунтом. Нажмите на заказ, чтобы увидеть состав.</p>
			</header>

			{error ? <div className={styles.errorBanner}>{error}</div> : null}

			{loading ?
				<p className={styles.loadingNote}>Загрузка заказов…</p>
			: orders.length === 0 ?
				<div className={styles.emptyState}>
					<p>Пока нет заказов.</p>
					<Link href="/categories" className={styles.emptyAction}>
						Перейти в каталог
					</Link>
				</div>
			:	<div className={styles.listStack}>
					{orders.map((order) => (
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
		</>
	);
}
