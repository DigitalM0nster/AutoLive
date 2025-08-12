import React from "react";
import { X } from "lucide-react";
import { FiltersBlockProps } from "@/lib/types";
import styles from "./styles.module.scss";

export default function FiltersBlock({
	activeFilters,
	onResetFilters,
	searchValue = "",
	onSearchChange,
	searchPlaceholder = "Поиск...",
	showSearch = false,
	disabled = false,
	className = "",
}: FiltersBlockProps) {
	// Проверяем, есть ли активные фильтры или поиск
	const hasActiveFilters = activeFilters.length > 0 || (showSearch && searchValue.trim() !== "");

	// Обработчик изменения поиска
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (onSearchChange) {
			onSearchChange(e.target.value);
		}
	};

	// Обработчик нажатия Enter в поиске
	const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			// Здесь можно добавить логику для сброса на первую страницу
			// или другие действия при нажатии Enter
		}
	};

	return (
		<div className={`${styles.filtersContainer} ${className}`}>
			<div className={styles.filtersInfo}>
				{/* Блок с активными фильтрами */}
				{hasActiveFilters && (
					<div className={styles.activeFilters}>
						Активные фильтры:
						{/* Отображаем активные фильтры */}
						{activeFilters.map((filter) => (
							<span key={filter.key} className={styles.filterBadge}>
								{filter.label}: {filter.value}
							</span>
						))}
						{/* Отображаем поиск как фильтр, если он есть */}
						{showSearch && searchValue.trim() !== "" && (
							<span className={styles.filterBadge}>Поиск: {searchValue}</span>
						)}
					</div>
				)}

				{/* Кнопка сброса фильтров */}
				<button
					onClick={onResetFilters}
					className={`resetFiltersButton ${styles.resetFiltersButton} ${
						!hasActiveFilters ? styles.disabled : ""
					}`}
					disabled={!hasActiveFilters || disabled}
				>
					<X size={16} />
					Сбросить фильтры
				</button>
			</div>

			{/* Поле поиска */}
			{showSearch && (
				<div className={`${styles.searchInput} searchInput`}>
					<input
						type="text"
						placeholder={searchPlaceholder}
						value={searchValue}
						onChange={handleSearchChange}
						onKeyDown={handleSearchKeyDown}
						className={styles.searchInput}
					/>
				</div>
			)}
		</div>
	);
} 