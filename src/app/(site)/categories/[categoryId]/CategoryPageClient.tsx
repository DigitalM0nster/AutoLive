"use client";

import { useState, useEffect } from "react";
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
	const allProducts = categoryData.category.products || [];
	const [filteredProducts, setFilteredProducts] = useState(allProducts);
	const [sortOption, setSortOption] = useState<string>("name");
	const [itemsPerPage, setItemsPerPage] = useState<number>(12);

	useEffect(() => {
		setFilteredProducts(categoryData.category.products || []);
	}, [categoryData.category.id, categoryData.category.products]);

	const hasFilters = allProducts.length > 0 || (categoryData.category.filters?.length ?? 0) > 0;

	return (
		<div className={styles.categoryPage}>
			<div className={styles.catalogLayout}>
				{hasFilters ? (
					<aside className={styles.filtersAside} aria-label="Фильтры">
						<FilterPanel
							products={allProducts}
							filters={categoryData.category.filters || []}
							setFilteredProducts={setFilteredProducts}
						/>
					</aside>
				) : null}

				<div className={styles.catalogMain}>
					<SortingPanel
						sortOption={sortOption}
						setSortOption={setSortOption}
						itemsPerPage={itemsPerPage}
						setItemsPerPage={setItemsPerPage}
						shownCount={filteredProducts.length}
						totalCount={allProducts.length}
					/>

					<ProductsList
						products={filteredProducts}
						sortOption={sortOption}
						itemsPerPage={itemsPerPage}
						categoryTitle={categoryData.category.title}
					/>
				</div>
			</div>
		</div>
	);
}
