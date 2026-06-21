"use client";

import { useState, useRef, useCallback } from "react";
import styles from "./styles.module.scss";

interface SearchInputProps {
	onSearch: (query: string) => void;
}

export default function SearchInput({ onSearch }: SearchInputProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearchQuery(value);

			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}

			searchTimeoutRef.current = setTimeout(() => {
				onSearch(value.trim());
			}, 300);
		},
		[onSearch],
	);

	const handleClear = useCallback(() => {
		setSearchQuery("");
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}
		onSearch("");
	}, [onSearch]);

	return (
		<div className={styles.searchRow}>
			<div className={styles.searchInputWrap}>
				<input
					type="search"
					value={searchQuery}
					onChange={(event) => handleSearchChange(event.target.value)}
					placeholder="Артикул, бренд или название..."
					className={styles.searchInput}
					autoComplete="off"
				/>
			</div>

			{searchQuery ? (
				<button type="button" onClick={handleClear} className={styles.clearButton}>
					Сбросить
				</button>
			) : null}
		</div>
	);
}
