"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { orderStatusLabelRu } from "@/lib/profileDisplayLabels";
import { formatDateTime, formatMoney } from "./profileUiUtils";
import styles from "./profileArea.module.scss";

type Item = {
	product_sku: string;
	product_title: string;
	product_price: number;
	product_brand: string;
	product_image: string | null;
	quantity: number;
	carModel: string | null;
	vinCode: string | null;
	lineTotal: number;
};

type OrderDetail = {
	id: number;
	status: string;
	createdAt: string;
	updatedAt: string;
	finalDeliveryDate: string | null;
	items: Item[];
	total: number;
	deliveryPoint: { name: string | null; address: string; phones: string[] } | null;
};

export default function ProfileOrderDetail() {
	const params = useParams();
	const id = typeof params?.id === "string" ? params.id : "";

	const [order, setOrder] = useState<OrderDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/user/profile/orders/${id}`, { credentials: "include" });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(typeof data.error === "string" ? data.error : "Ошибка загрузки");
			}
			setOrder(data as OrderDetail);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Ошибка загрузки");
			setOrder(null);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		void load();
	}, [load]);

	if (loading) {
		return <p className={styles.loadingNote}>Загрузка заказа…</p>;
	}

	if (error || !order) {
		return (
			<>
				<Link href="/profile/orders" className={styles.backLink}>
					← К списку заказов
				</Link>
				<div className={styles.errorBanner}>{error || "Заказ не найден"}</div>
			</>
		);
	}

	return (
		<>
			<Link href="/profile/orders" className={styles.backLink}>
				← К списку заказов
			</Link>

			<header className={styles.detailHeader}>
				<h1 className={styles.pageTitle}>Заказ №{order.id}</h1>
				<div className={styles.detailMeta}>
					<span className={styles.statusBadge}>{orderStatusLabelRu(order.status)}</span>
					<span className={styles.muted}>{formatDateTime(order.createdAt)}</span>
				</div>
			</header>

			<div className={styles.panelCard}>
				<h2 className={styles.panelTitle}>Информация о заказе</h2>
				<div className={styles.detailFacts}>
					<div className={styles.detailFactRow}>
						<strong>Обновлён:</strong> {formatDateTime(order.updatedAt)}
					</div>
					{order.finalDeliveryDate ?
						<div className={styles.detailFactRow}>
							<strong>Ориентировочная дата:</strong> {formatDateTime(order.finalDeliveryDate)}
						</div>
					:	null}
				</div>
			</div>

			{order.deliveryPoint ?
				<div className={styles.panelCard}>
					<h2 className={styles.panelTitle}>Пункт / адрес</h2>
					<div className={styles.deliveryBlock}>
						{order.deliveryPoint.name ?
							<div>{order.deliveryPoint.name}</div>
						:	null}
						<div>{order.deliveryPoint.address}</div>
						{order.deliveryPoint.phones?.length > 0 ?
							<div>Тел.: {order.deliveryPoint.phones.join(", ")}</div>
						:	null}
					</div>
				</div>
			:	null}

			<div className={styles.card}>
				<h2 className={styles.panelTitle}>Состав заказа</h2>
				<table className={styles.itemsTable}>
					<thead>
						<tr>
							<th />
							<th>Товар</th>
							<th>Артикул</th>
							<th>Цена</th>
							<th>Кол-во</th>
							<th>Сумма</th>
						</tr>
					</thead>
					<tbody>
						{order.items.map((it) => (
							<tr key={`${it.product_sku}-${it.product_title}`}>
								<td>
									{it.product_image ?
										<img className={styles.thumb} src={it.product_image} alt="" />
									:	null}
								</td>
								<td className={styles.itemTitleCell}>
									<div>{it.product_title}</div>
									<div className={styles.muted}>{it.product_brand}</div>
									{(it.carModel || it.vinCode) && (
										<div className={styles.muted}>
											{it.carModel && <>Авто: {it.carModel}</>}
											{it.vinCode && <> · VIN: {it.vinCode}</>}
										</div>
									)}
								</td>
								<td>{it.product_sku}</td>
								<td>{formatMoney(it.product_price)}</td>
								<td>{it.quantity}</td>
								<td>{formatMoney(it.lineTotal)}</td>
							</tr>
						))}
					</tbody>
				</table>
				<div className={`${styles.rowBetween} ${styles.totalRow}`.trim()}>
					<strong>Итого</strong>
					<strong>{formatMoney(order.total)}</strong>
				</div>
			</div>

			<p className={styles.muted}>По вопросам заказа свяжитесь с нами через раздел «Контакты» или дождитесь звонка менеджера.</p>
		</>
	);
}
