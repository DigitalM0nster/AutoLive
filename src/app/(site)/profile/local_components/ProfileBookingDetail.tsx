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
		return <p className={styles.redirectNote}>Загрузка записи…</p>;
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
			<h1 className={styles.pageTitle}>Запись №{b.id}</h1>

			<div className={styles.card}>
				<div className={styles.rowBetween}>
					<div className={styles.muted}>Статус</div>
					<div className={styles.orderStatus}>{bookingStatusLabelRu(b.status)}</div>
				</div>
				<div className={styles.bookingRow}>
					<strong>Дата:</strong> {formatDateRu(b.scheduledDate)}
				</div>
				<div className={styles.bookingRow}>
					<strong>Время:</strong> {b.scheduledTime}
				</div>
				<div className={styles.bookingRow}>
					<strong>Телефон для связи:</strong> {b.contactPhone}
				</div>
			</div>

			<div className={styles.card}>
				<div className={styles.subTitle}>Отдел</div>
				<div className={styles.deliveryBlock}>
					{b.departmentName && <div>{b.departmentName}</div>}
					<div>{b.departmentAddress}</div>
					{b.departmentPhones?.length > 0 && <div>Тел.: {b.departmentPhones.join(", ")}</div>}
					{b.departmentEmails?.length > 0 && <div>Email: {b.departmentEmails.join(", ")}</div>}
				</div>
			</div>

			{b.notes && (
				<div className={styles.card}>
					<div className={styles.subTitle}>Комментарий к записи</div>
					<div className={`${styles.bookingRow} ${styles.notesBlock}`.trim()}>
						{b.notes}
					</div>
				</div>
			)}
		</>
	);
}
