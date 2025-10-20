// src/app/(site)/products/SearchInput.tsx

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import styles from "./styles.module.scss";
import Loading from "@/components/ui/loading/Loading";

interface SearchInputProps {
	onSearch: (query: string) => void;
	onResultClick: (result: any) => void;
}

export default function SearchInput({ onSearch, onResultClick }: SearchInputProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [showSearchResults, setShowSearchResults] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const [maxSecondColumnWidth, setMaxSecondColumnWidth] = useState(0);

	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearchQuery(value);

			// Очищаем предыдущий таймаут
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}

			// Если поиск пустой, скрываем результаты
			if (!value.trim()) {
				setSearchResults([]);
				setShowSearchResults(false);
				onSearch("");
				return;
			}

			// Дебаунс для поиска выпадающего списка
			searchTimeoutRef.current = setTimeout(async () => {
				try {
					setSearchLoading(true);
					const response = await fetch(`/api/products/search?q=${encodeURIComponent(value)}&limit=10`);
					const data = await response.json();
					setSearchResults(data.results || []);
					setShowSearchResults(true);

					// Вызываем поиск товаров
					onSearch(value);
				} catch (error) {
					console.error("Ошибка поиска:", error);
				} finally {
					setSearchLoading(false);
				}
			}, 300);
		},
		[onSearch]
	);

	const handleResultClick = useCallback(
		(result: any) => {
			setSearchQuery("");
			setShowSearchResults(false);
			setSearchResults([]);
			onResultClick(result);
		},
		[onResultClick]
	);

	const handleClear = useCallback(() => {
		setSearchQuery("");
		setShowSearchResults(false);
		setSearchResults([]);
		onSearch("");
	}, [onSearch]);

	const handleFocus = useCallback(() => {
		setIsFocused(true);
	}, []);

	const handleBlur = useCallback(() => {
		setIsFocused(false);
	}, []);

	// Вычисляем максимальную ширину второй колонки
	useEffect(() => {
		if (searchResults.length > 0 && resultsRef.current) {
			const secondColumnCells = resultsRef.current.querySelectorAll(`.${styles.searchResultItem} .${styles.seatchResultItemBlock}:nth-child(2)`);
			let maxWidth = 0;

			secondColumnCells.forEach((cell) => {
				const width = cell.scrollWidth;
				if (width > maxWidth) {
					maxWidth = width;
				}
			});

			setMaxSecondColumnWidth(maxWidth);
		}
	}, [searchResults]);

	// Закрываем результаты поиска при клике вне
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setShowSearchResults(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<div ref={containerRef} className={styles.searchBlock}>
			<div className={styles.searchInputContainer}>
				<input
					ref={searchInputRef}
					type="text"
					placeholder="Поиск по названию, артикулу, бренду или категории..."
					value={searchQuery}
					onChange={(e) => handleSearchChange(e.target.value)}
					onFocus={handleFocus}
					onBlur={handleBlur}
					className={styles.searchInput}
					autoComplete="off"
				/>

				{showSearchResults && searchResults.length > 0 && (
					<div ref={resultsRef} className={`${styles.searchResults} ${isFocused ? styles.blue : ""}`}>
						{searchResults.map((result, index) => (
							<div key={`${result.type}-${result.id}-${index}`} className={styles.searchResultItem} onClick={() => handleResultClick(result)}>
								<div className={`${styles.seatchResultItemBlock} ${styles.searchResultType}`}>{result.type === "category" ? "Категория" : "Товар"}</div>
								<div
									className={`${styles.seatchResultItemBlock} ${styles.searchResultTitle}`}
									style={{ width: maxSecondColumnWidth > 0 ? `${maxSecondColumnWidth}px` : "auto" }}
								>
									{result.title}
								</div>
								<div className={`${styles.seatchResultItemBlock} ${styles.searchResultSubtitle}`}>{result.subtitle}</div>
							</div>
						))}
					</div>
				)}

				{searchLoading && (
					<div className={`${styles.searchResults} ${isFocused ? styles.blue : ""}`}>
						<div className={styles.seatchPadding}>
							<Loading white={false} />
						</div>
					</div>
				)}
			</div>

			<button onClick={handleClear} className={styles.clearButton}>
				Очистить
			</button>
		</div>
	);
}
