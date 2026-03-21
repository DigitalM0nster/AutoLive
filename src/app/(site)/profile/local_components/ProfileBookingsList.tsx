"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { bookingStatusLabelRu } from "@/lib/profileDisplayLabels";
import styles from "./profileArea.module.scss";

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

export default function ProfileBookingsList() {
	const [bookings, setBookings] = useState<BookingRow[]>([]);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const res = await fetch("/api/user/profile/bookings", { credentials: "include" });
			if (res.ok) {
				setBookings(await res.json());
			} else {
				setError("Не удалось загрузить записи.");
			}
		} catch {
			setError("Не удалось загрузить записи.");
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<>
			<h1 className={styles.pageTitle}>Мои записи на ТО</h1>
			<p className={styles.muted}>Менеджер свяжется с вами по указанному телефону.</p>
			{error && <div className={styles.errorBanner}>{error}</div>}

			{bookings.length === 0 ?
				<div className={styles.emptyState}>
					Записей пока нет. <Link href="/booking">Записаться на обслуживание</Link>
				</div>
			:	bookings.map((row) => (
					<Link key={row.id} href={`/profile/bookings/${row.id}`} className={styles.orderListCard}>
						<div className={styles.rowBetween}>
							<div className={styles.orderId}>
								Запись №{row.id} · {bookingStatusLabelRu(row.status)}
							</div>
						</div>
						<div className={styles.bookingRow}>
							<strong>Дата и время:</strong> {row.scheduledDate} в {row.scheduledTime}
						</div>
						<div className={styles.bookingRow}>
							<strong>Адрес:</strong> {row.departmentName ? `${row.departmentName}, ` : ""}
							{row.departmentAddress}
						</div>
						<div className={styles.bookingRow}>
							<strong>Телефон:</strong> {row.contactPhone}
						</div>
						<div className={styles.linkDetail}>Подробнее</div>
					</Link>
				))
			}
		</>
	);
}
