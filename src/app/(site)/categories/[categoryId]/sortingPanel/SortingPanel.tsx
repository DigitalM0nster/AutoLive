"use client";

import styles from "../styles.module.scss";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";

type SortingPanelProps = {
	sortOption: string;
	setSortOption: (value: string) => void;
	itemsPerPage: number;
	setItemsPerPage: (value: number) => void;
	shownCount: number;
	totalCount: number;
};

const SORT_OPTIONS = [
	{ value: "name", label: "По названию" },
	{ value: "price_asc", label: "Сначала дешевле" },
	{ value: "price_desc", label: "Сначала дороже" },
];

const PAGE_SIZE_OPTIONS = [
	{ value: "12", label: "12" },
	{ value: "24", label: "24" },
	{ value: "48", label: "48" },
];

export default function SortingPanel({
	sortOption,
	setSortOption,
	itemsPerPage,
	setItemsPerPage,
	shownCount,
	totalCount,
}: SortingPanelProps) {
	const isFiltered = shownCount !== totalCount;

	return (
		<div className={styles.catalogToolbar}>
			<div className={styles.resultsSummary}>
				<p className={styles.resultsCount}>
					{isFiltered ?
						<>
							<span className={styles.resultsNumber}>{shownCount.toLocaleString("ru-RU")}</span> из{" "}
							{totalCount.toLocaleString("ru-RU")}
						</>
					:	<>
							<span className={styles.resultsNumber}>{shownCount.toLocaleString("ru-RU")}</span>{" "}
							{shownCount === 1 ? "позиция" : shownCount >= 2 && shownCount <= 4 ? "позиции" : "позиций"}
						</>}
				</p>
				{isFiltered ? <p className={styles.resultsHint}>По выбранным фильтрам</p> : null}
			</div>

			<div className={styles.toolbarControls}>
				<div className={styles.toolbarField}>
					<span className={styles.toolbarLabel}>Сортировка</span>
					<CustomSelect
						options={SORT_OPTIONS}
						value={sortOption}
						onChange={setSortOption}
						fullWidth
						variant="site"
						className={styles.toolbarSelectControl}
					/>
				</div>

				<div className={styles.toolbarField}>
					<span className={styles.toolbarLabel}>На странице</span>
					<CustomSelect
						options={PAGE_SIZE_OPTIONS}
						value={String(itemsPerPage)}
						onChange={(value) => setItemsPerPage(Number(value))}
						fullWidth
						variant="site"
						className={styles.toolbarSelectControl}
					/>
				</div>
			</div>
		</div>
	);
}
