"use client";

import { useState, useCallback } from "react";
import SearchInput from "./SearchInput";
import ProductsList from "./ProductsList";
import styles from "./styles.module.scss";

export default function ProductsPageClient() {
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = useCallback((query: string) => {
		setSearchQuery(query);
	}, []);

	return (
		<div className={styles.productsContainer}>
			<div className={styles.searchPanel}>
				<p className={styles.searchHint}>Введите артикул, бренд или название детали</p>
				<SearchInput onSearch={handleSearch} />
			</div>

			<ProductsList searchQuery={searchQuery} />
		</div>
	);
}
