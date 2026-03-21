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

	const load = useCallback(async () => {
		setError(null);
		try {
			const res = await fetch("/api/user/profile/orders", { credentials: "include" });
			if (res.ok) setOrders(await res.json());
			else setError("Не удалось загрузить заказы.");
		} catch {
			setError("Не удалось загрузить заказы.");
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<>
			<h1 className={styles.pageTitle}>Мои заказы</h1>
			<p className={styles.muted}>Список заявок, оформленных под вашим аккаунтом.</p>
			{error && <div className={styles.errorBanner}>{error}</div>}

			{orders.length === 0 ?
				<div className={styles.emptyState}>
					Пока нет заказов. <Link href="/catalog">Перейти в каталог</Link>
				</div>
			:	orders.map((o) => (
					<Link key={o.id} href={`/profile/orders/${o.id}`} className={styles.orderListCard}>
						<div className={styles.rowBetween}>
							<div className={styles.orderId}>Заказ №{o.id}</div>
							<div className={styles.orderStatus}>{orderStatusLabelRu(o.status)}</div>
						</div>
						<div className={styles.orderMeta}>
							{formatDateTime(o.createdAt)} · {o.itemsCount} поз. · {formatMoney(o.total)}
						</div>
						{o.previewTitles.length > 0 && <div className={styles.orderPreview}>{o.previewTitles.join(" · ")}</div>}
						<div className={styles.linkDetail}>Открыть состав и детали</div>
					</Link>
				))
			}
		</>
	);
}
