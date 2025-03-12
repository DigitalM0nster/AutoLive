"use client";

import { useState } from "react";
import styles from "./styles.module.scss";
import FilterPanel from "./filterPanel/FilterPanel";
import SortingPanel from "./sortingPanel/ProductsList";
import ProductsList from "./productsList/ProductsList";

export default function CategoryPageClient({ categoryData }) {
	const [filteredProducts, setFilteredProducts] = useState(categoryData.category.products);
	const [sortOption, setSortOption] = useState("name");
	const [itemsPerPage, setItemsPerPage] = useState(10);

	return (
		<div className={styles.materialContainer}>
			<div className={styles.block}>
				{/* Панель сортировки */}
				<SortingPanel sortOption={sortOption} setSortOption={setSortOption} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} />
			</div>
			<div className={styles.block}>
				{/* Фильтр */}
				<FilterPanel products={categoryData.category.products} filters={categoryData.category.filters} setFilteredProducts={setFilteredProducts} />

				{/* Список товаров */}
				<ProductsList products={filteredProducts} sortOption={sortOption} itemsPerPage={itemsPerPage} categoryData={categoryData} />
			</div>
		</div>
	);
}
