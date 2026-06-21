"use client";

import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import {
	managerDepartmentLine,
	managerFullName,
	managerPhoneLine,
	managerRoleLabelRu,
	managerRoleToneKey,
	type ManagerSearchListRow,
} from "@/lib/managerSearchDisplay";
import styles from "./ManagerSearchDropdownItems.module.scss";

type ManagerSearchResultsPanelProps = {
	loading?: boolean;
	results: ManagerSearchListRow[];
	onSelect: (row: ManagerSearchListRow) => void;
	emptyLabel?: string;
};

/** Компактный выпадающий список ответственных при поиске */
export function ManagerSearchResultsPanel({
	loading = false,
	results,
	onSelect,
	emptyLabel = "Сотрудники не найдены — проверьте имя или телефон",
}: ManagerSearchResultsPanelProps) {
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
					const roleTone = managerRoleToneKey(row.role);

					return (
						<div key={row.id} className={`searchResultItem ${styles.resultItem}`} onMouseDown={() => onSelect(row)}>
							<div className={styles.resultTop}>
								<span className={styles.resultName}>{managerFullName(row)}</span>
								<span className={styles.resultId}>#{row.id}</span>
								<span className={[styles.roleBadge, styles[roleTone]].filter(Boolean).join(" ")}>{managerRoleLabelRu(row.role)}</span>
							</div>
							<div className={styles.metaLine}>
								<span className={styles.metaLabel}>Телефон</span>
								<span>{managerPhoneLine(row.phone)}</span>
							</div>
							<div className={styles.metaLine}>
								<span className={styles.metaLabel}>Отдел</span>
								<span>{managerDepartmentLine(row)}</span>
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

type ManagerSelectedSummaryProps = {
	manager: ManagerSearchListRow;
};

/** Карточка выбранного ответственного */
export function ManagerSelectedSummary({ manager }: ManagerSelectedSummaryProps) {
	const roleTone = managerRoleToneKey(manager.role);

	return (
		<div className={styles.selectedCard}>
			<div className={styles.selectedTop}>
				<Link href={`/admin/users/${manager.id}`} className={styles.selectedLink} target="_blank">
					{managerFullName(manager)}
				</Link>
				<span className={styles.resultId}>#{manager.id}</span>
				<span className={[styles.roleBadge, styles[roleTone]].filter(Boolean).join(" ")}>{managerRoleLabelRu(manager.role)}</span>
			</div>
			<div className={styles.selectedMeta}>{managerPhoneLine(manager.phone)}</div>
			<div className={styles.selectedMeta}>
				{manager.department?.id ? (
					<>
						Отдел:{" "}
						<Link href={`/admin/departments/${manager.department.id}`} className={styles.departmentLink} target="_blank">
							{manager.department.name || "—"}
						</Link>
					</>
				) : (
					<>Отдел: {managerDepartmentLine(manager)}</>
				)}
			</div>
		</div>
	);
}
