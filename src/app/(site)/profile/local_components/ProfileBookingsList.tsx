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
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/user/profile/bookings", { credentials: "include" });
			if (res.ok) setBookings(await res.json());
			else setError("Не удалось загрузить записи.");
		} catch {
			setError("Не удалось загрузить записи.");
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
				<h1 className={styles.pageTitle}>Записи на ТО</h1>
				<p className={styles.pageLead}>История записей на техническое обслуживание. Менеджер свяжется с вами по указанному телефону.</p>
			</header>

			{error ? <div className={styles.errorBanner}>{error}</div> : null}

			{loading ?
				<p className={styles.loadingNote}>Загрузка записей…</p>
			: bookings.length === 0 ?
				<div className={styles.emptyState}>
					<p>Записей пока нет.</p>
					<Link href="/booking" className={styles.emptyAction}>
						Записаться на ТО
					</Link>
				</div>
			:	<div className={styles.listStack}>
					{bookings.map((booking) => (
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
							<p className={styles.listCardPreview}>Телефон: {booking.contactPhone}</p>
						</Link>
					))}
				</div>
			}
		</>
	);
}
