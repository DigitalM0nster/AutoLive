"use client";

import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import {
	clientFullName,
	clientPhoneLine,
	clientStatusLabelRu,
	clientStatusToneKey,
	type ClientSearchListRow,
} from "@/lib/clientSearchDisplay";
import styles from "./ClientSearchDropdownItems.module.scss";

type ClientSearchResultsPanelProps = {
	loading?: boolean;
	results: ClientSearchListRow[];
	onSelect: (row: ClientSearchListRow) => void;
	emptyLabel?: string;
};

/** Компактный выпадающий список клиентов при поиске */
export function ClientSearchResultsPanel({
	loading = false,
	results,
	onSelect,
	emptyLabel = "Клиенты не найдены — проверьте имя или телефон",
}: ClientSearchResultsPanelProps) {
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
					const statusTone = clientStatusToneKey(row.status);

					return (
						<div key={row.id} className={`searchResultItem ${styles.resultItem}`} onMouseDown={() => onSelect(row)}>
							<div className={styles.resultTop}>
								<span className={styles.resultName}>{clientFullName(row)}</span>
								<span className={styles.resultId}>#{row.id}</span>
								<span className={[styles.statusBadge, styles[statusTone]].filter(Boolean).join(" ")}>
									{clientStatusLabelRu(row.status)}
								</span>
							</div>
							<div className={styles.metaLine}>
								<span className={styles.metaLabel}>Телефон</span>
								<span>{clientPhoneLine(row.phone)}</span>
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

type ClientSelectedSummaryProps = {
	client: ClientSearchListRow;
};

/** Карточка выбранного клиента */
export function ClientSelectedSummary({ client }: ClientSelectedSummaryProps) {
	const statusTone = clientStatusToneKey(client.status);

	return (
		<div className={styles.selectedCard}>
			<div className={styles.selectedTop}>
				<Link href={`/admin/users/${client.id}`} className={styles.selectedLink} target="_blank">
					{clientFullName(client)}
				</Link>
				<span className={styles.resultId}>#{client.id}</span>
				<span className={[styles.statusBadge, styles[statusTone]].filter(Boolean).join(" ")}>{clientStatusLabelRu(client.status)}</span>
			</div>
			<div className={styles.selectedMeta}>{clientPhoneLine(client.phone)}</div>
		</div>
	);
}
