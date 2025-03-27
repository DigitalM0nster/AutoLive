// src\app\service-materials\[materialsCategoryId]\CategoryPageClient.tsx

"use client";

import { useState } from "react";
import styles from "./styles.module.scss";
import FilterPanel from "./filterPanel/FilterPanel";
import SortingPanel from "./sortingPanel/SortingPanel";
import ProductsList from "./productsList/ProductsList";
import type { Category } from "@/lib/types";

type CategoryPageClientProps = {
	categoryData: {
		category: Category;
	};
};

export default function CategoryPageClient({ categoryData }: CategoryPageClientProps) {
	const [filteredProducts, setFilteredProducts] = useState(categoryData.category.products || []);
	const [sortOption, setSortOption] = useState<string>("name");
	const [itemsPerPage, setItemsPerPage] = useState<number>(10);

	return (
		<div className={styles.materialContainer}>
			<div className={styles.block}>
				<SortingPanel sortOption={sortOption} setSortOption={setSortOption} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} />
			</div>

			<div className={styles.block}>
				<FilterPanel products={categoryData.category.products || []} filters={categoryData.category.filters || []} setFilteredProducts={setFilteredProducts} />

				<ProductsList products={filteredProducts} sortOption={sortOption} itemsPerPage={itemsPerPage} categoryData={categoryData} />
			</div>
		</div>
	);
}
