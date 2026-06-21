"use client";

import Loading from "@/components/ui/loading/Loading";
import { formatProductPrice, productDepartmentLine, type ProductSearchListRow } from "@/lib/productSearchDisplay";
import styles from "./ProductSearchDropdownItems.module.scss";

type ProductSearchResultsPanelProps = {
	loading?: boolean;
	results: ProductSearchListRow[];
	onSelect: (row: ProductSearchListRow) => void;
	emptyLabel?: string;
};

/** Компактный выпадающий список товаров при добавлении в заказ */
export function ProductSearchResultsPanel({
	loading = false,
	results,
	onSelect,
	emptyLabel = "Товары не найдены — измените запрос",
}: ProductSearchResultsPanelProps) {
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
				results.map((row) => (
					<div key={row.id} className={`searchResultItem ${styles.resultItem}`} onMouseDown={() => onSelect(row)}>
						<div className={styles.resultRow}>
							<div className={styles.thumb}>
								{row.image ? (
									<img src={row.image} alt="" className={styles.thumbImage} loading="lazy" />
								) : (
									<span className={styles.thumbEmpty}>—</span>
								)}
							</div>
							<div className={styles.resultBody}>
								<div className={styles.resultTop}>
									<span className={styles.resultTitle}>{row.title}</span>
									<span className={styles.resultSku}>{row.sku}</span>
									<span className={styles.priceBadge}>{formatProductPrice(row.price)}</span>
								</div>
								<div className={styles.metaGrid}>
									<div className={styles.metaLine}>
										<span className={styles.metaLabel}>Бренд</span>
										<span>{row.brand || "—"}</span>
									</div>
									<div className={styles.metaLine}>
										<span className={styles.metaLabel}>Закупка</span>
										<span>{formatProductPrice(row.supplierPrice)}</span>
									</div>
									<div className={styles.metaLine}>
										<span className={styles.metaLabel}>Отдел</span>
										<span>{productDepartmentLine(row)}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				))
			) : (
				<div className={`searchResultItem ${styles.emptyState}`}>{emptyLabel}</div>
			)}
		</div>
	);
}
