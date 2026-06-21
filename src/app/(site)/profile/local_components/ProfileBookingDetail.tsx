"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { bookingStatusLabelRu } from "@/lib/profileDisplayLabels";
import { formatDateRu } from "./profileUiUtils";
import styles from "./profileArea.module.scss";

type BookingDetail = {
	id: number;
	scheduledDate: string;
	scheduledTime: string;
	contactPhone: string;
	status: string;
	notes: string | null;
	createdAt: string;
	departmentName: string | null;
	departmentAddress: string;
	departmentPhones: string[];
	departmentEmails: string[];
};

export default function ProfileBookingDetail() {
	const params = useParams();
	const id = typeof params?.id === "string" ? params.id : "";

	const [b, setB] = useState<BookingDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/user/profile/bookings/${id}`, { credentials: "include" });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(typeof data.error === "string" ? data.error : "Ошибка загрузки");
			}
			setB(data as BookingDetail);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Ошибка загрузки");
			setB(null);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		void load();
	}, [load]);

	if (loading) {
		return <p className={styles.loadingNote}>Загрузка записи…</p>;
	}

	if (error || !b) {
		return (
			<>
				<Link href="/profile/bookings" className={styles.backLink}>
					← К списку записей
				</Link>
				<div className={styles.errorBanner}>{error || "Запись не найдена"}</div>
			</>
		);
	}

	return (
		<>
			<Link href="/profile/bookings" className={styles.backLink}>
				← К списку записей
			</Link>

			<header className={styles.detailHeader}>
				<h1 className={styles.pageTitle}>Запись №{b.id}</h1>
				<div className={styles.detailMeta}>
					<span className={styles.statusBadge}>{bookingStatusLabelRu(b.status)}</span>
				</div>
			</header>

			<div className={styles.panelCard}>
				<h2 className={styles.panelTitle}>Дата и контакты</h2>
				<div className={styles.detailFacts}>
					<div className={styles.detailFactRow}>
						<strong>Дата:</strong> {formatDateRu(b.scheduledDate)}
					</div>
					<div className={styles.detailFactRow}>
						<strong>Время:</strong> {b.scheduledTime}
					</div>
					<div className={styles.detailFactRow}>
						<strong>Телефон для связи:</strong> {b.contactPhone}
					</div>
				</div>
			</div>

			<div className={styles.panelCard}>
				<h2 className={styles.panelTitle}>Отдел</h2>
				<div className={styles.deliveryBlock}>
					{b.departmentName ?
						<div>{b.departmentName}</div>
					:	null}
					<div>{b.departmentAddress}</div>
					{b.departmentPhones?.length > 0 ?
						<div>Тел.: {b.departmentPhones.join(", ")}</div>
					:	null}
					{b.departmentEmails?.length > 0 ?
						<div>Email: {b.departmentEmails.join(", ")}</div>
					:	null}
				</div>
			</div>

			{b.notes ?
				<div className={styles.panelCard}>
					<h2 className={styles.panelTitle}>Комментарий к записи</h2>
					<div className={`${styles.bookingRow} ${styles.notesBlock}`.trim()}>{b.notes}</div>
				</div>
			:	null}
		</>
	);
}
