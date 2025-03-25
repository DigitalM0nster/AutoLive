// src\app\service-materials\[materialsCategoryId]\sortingPanel\SortingPanel.tsx

"use client";

import styles from "../styles.module.scss";

type SortingPanelProps = {
	sortOption: string;
	setSortOption: (value: string) => void;
	itemsPerPage: number;
	setItemsPerPage: (value: number) => void;
};

export default function SortingPanel({ sortOption, setSortOption, itemsPerPage, setItemsPerPage }: SortingPanelProps) {
	return (
		<div className={styles.sortingPanel}>
			{/* Выбор сортировки */}
			<div className={styles.sortBlock}>
				<label>Сортировка:</label>
				<select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
					<option value="name">По названию</option>
					<option value="price_asc">По цене (дешевле)</option>
					<option value="price_desc">По цене (дороже)</option>
				</select>
			</div>

			{/* Количество товаров на странице */}
			<div className={styles.sortBlock}>
				<label>Товаров на странице:</label>
				<select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
					<option value="5">5</option>
					<option value="10">10</option>
					<option value="20">20</option>
				</select>
			</div>
		</div>
	);
}
