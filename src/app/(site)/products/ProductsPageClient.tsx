// src/app/(site)/products/ProductsPageClient.tsx

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import SearchInput from "./SearchInput";
import ProductsList from "./ProductsList";
import styles from "./styles.module.scss";

export default function ProductsPageClient() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = useCallback((query: string) => {
		setSearchQuery(query);
	}, []);

	const handleResultClick = useCallback(
		(result: any) => {
			if (result.type === "category") {
				router.push(`/categories/${result.id}`);
			} else if (result.type === "product") {
				router.push(`/products/${result.id}`);
			}
		},
		[router]
	);

	return (
		<div className={styles.productsContainer}>
			{/* Поиск */}
			<div className={styles.searchAndFilters}>
				<SearchInput onSearch={handleSearch} onResultClick={handleResultClick} />
			</div>

			{/* Список товаров */}
			<ProductsList searchQuery={searchQuery} />
		</div>
	);
}
