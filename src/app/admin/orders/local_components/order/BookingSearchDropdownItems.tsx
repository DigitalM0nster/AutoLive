"use client";

import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import {
	bookingClientLine,
	bookingDepartmentLine,
	bookingManagerLine,
	bookingStatusLabelRu,
	bookingStatusToneKey,
	formatBookingRuDate,
	type BookingSearchListRow,
	bookingPersonName,
} from "@/lib/bookingSearchForOrderDisplay";
import styles from "./BookingSearchDropdownItems.module.scss";

type BookingSearchResultsPanelProps = {
	loading?: boolean;
	results: BookingSearchListRow[];
	onSelect: (row: BookingSearchListRow) => void;
	emptyLabel?: string;
};

/** Выпадающий список результатов поиска записи для привязки к заказу */
export function BookingSearchResultsPanel({
	loading = false,
	results,
	onSelect,
	emptyLabel = "Нет свободных записей с таким номером",
}: BookingSearchResultsPanelProps) {
	if (loading) {
		return (
			<div className={`searchResults ${styles.resultsPanel} ${styles.isLoading}`}>
				<Loading />
			</div>
		);
	}

	return (
		<div className={`searchResults ${styles.resultsPanel}`}>
			{results.length > 0 ? (
				results.map((row) => {
					const when = formatBookingRuDate(row.scheduledDate);
					const managerLine = bookingManagerLine(row);
					const statusTone = bookingStatusToneKey(String(row.status));

					return (
						<div key={row.id} className={`searchResultItem ${styles.resultItem}`} onMouseDown={() => onSelect(row)}>
							<div className={styles.resultTop}>
								<span className={styles.resultId}>Запись #{row.id}</span>
								<span className={styles.resultWhen}>
									{when} · {row.scheduledTime}
								</span>
								<span className={[styles.statusBadge, styles[statusTone]].filter(Boolean).join(" ")}>{bookingStatusLabelRu(String(row.status))}</span>
							</div>
							<div className={styles.metaLine}>
								<span className={styles.metaLabel}>Клиент</span>
								<span>{bookingClientLine(row)}</span>
							</div>
							{managerLine ? (
								<div className={styles.metaLine}>
									<span className={styles.metaLabel}>Менеджер</span>
									<span>{bookingPersonName(row.manager) || "—"}</span>
								</div>
							) : null}
							<div className={styles.metaLine}>
								<span className={styles.metaLabel}>Отдел</span>
								<span>{bookingDepartmentLine(row)}</span>
							</div>
						</div>
					);
				})
			) : (
				<div className={`searchResultItem ${styles.emptyState}`}>{emptyLabel}</div>
			)}
		</div>
	);
}

type BookingSelectedSummaryProps = {
	booking: BookingSearchListRow;
};

/** Компактная карточка уже выбранной записи */
export function BookingSelectedSummary({ booking }: BookingSelectedSummaryProps) {
	const when = formatBookingRuDate(booking.scheduledDate);
	const statusTone = bookingStatusToneKey(String(booking.status));
	const managerLine = bookingManagerLine(booking);

	return (
		<div className={styles.selectedCard}>
			<div className={styles.selectedTop}>
				<Link href={`/admin/bookings/${booking.id}`} className={styles.selectedLink} target="_blank">
					Запись #{booking.id}
				</Link>
				<span className={styles.resultWhen}>
					{when} · {booking.scheduledTime}
				</span>
				<span className={[styles.statusBadge, styles[statusTone]].filter(Boolean).join(" ")}>{bookingStatusLabelRu(String(booking.status))}</span>
			</div>
			<div className={styles.selectedMeta}>{bookingClientLine(booking)}</div>
			{managerLine ? <div className={styles.selectedMeta}>{managerLine}</div> : null}
			<div className={styles.selectedMeta}>{bookingDepartmentLine(booking)}</div>
		</div>
	);
}
