"use client";

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
	children,
	hasRealActiveFilters = true, // По умолчанию true для обратной совместимости
	onSelectAllByFilters,
	isLoadingBulkOperation = false,
	selectedProductsCount = 0,
	onBulkDelete,
	onBulkExport,
	onClearSelection,
}: FiltersBlockProps) {
	// Проверяем, есть ли активные фильтры или поиск
	const hasActiveFilters = activeFilters.length > 0 || (showSearch && searchValue.trim() !== "");

	// Определяем, должна ли кнопка сброса быть активной
	const shouldEnableResetButton = hasRealActiveFilters && hasActiveFilters;

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

			{/* Дополнительные фильтры (children) */}
			{children && <div className={styles.additionalFilters}>{children}</div>}

			<div className={styles.filtersInfo}>
				{/* Кнопка сброса фильтров */}
				<button
					onClick={onResetFilters}
					className={`resetFiltersButton ${styles.resetFiltersButton} ${!shouldEnableResetButton ? styles.disabled : ""}`}
					disabled={!shouldEnableResetButton || disabled}
				>
					<X size={16} />
					Сбросить активные фильтры
				</button>
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
						{showSearch && searchValue.trim() !== "" && <span className={styles.filterBadge}>Поиск: {searchValue}</span>}
					</div>
				)}

				{/* Блок выбора всех товаров по фильтрам */}
				{onSelectAllByFilters && (
					<div className={styles.selectAllByFiltersContainer}>
						<div
							onClick={onSelectAllByFilters}
							className={`${styles.selectAllByFiltersButton} ${isLoadingBulkOperation ? styles.disabled : ""}`}
							title={isLoadingBulkOperation ? "Выполняется операция..." : "Выбрать все товары, соответствующие активным фильтрам"}
						>
							{isLoadingBulkOperation ? "⏳ Загрузка..." : "Выбрать все товары по активным фильтрам"}
						</div>
						{onClearSelection && (
							<div
								onClick={onClearSelection}
								className={`${styles.clearSelectionButton} ${isLoadingBulkOperation || selectedProductsCount === 0 ? styles.disabled : ""}`}
								title={
									isLoadingBulkOperation
										? "Выполняется операция..."
										: selectedProductsCount === 0
										? "Не выбрано ни одного товара"
										: "Снять выбор с выбранных товаров"
								}
							>
								Снять выбор
							</div>
						)}
					</div>
				)}

				{/* Блок массовых операций */}
				{onSelectAllByFilters && (
					<div className={styles.bulkActionsPanel}>
						<div className={styles.bulkActionsInfo}>
							Выбрано товаров: <strong>{selectedProductsCount}</strong>
						</div>
						<div className={styles.bulkActionsButtons}>
							{onBulkExport && (
								<button
									onClick={onBulkExport}
									className={`${styles.bulkActionButton} ${styles.exportButton}`}
									disabled={isLoadingBulkOperation || selectedProductsCount === 0}
									title={
										isLoadingBulkOperation
											? "Выполняется операция..."
											: selectedProductsCount === 0
											? "Не выбрано ни одного товара"
											: "Экспортировать выбранные товары в Excel"
									}
								>
									📊 Экспортировать выбранные
								</button>
							)}
							{onBulkDelete && (
								<button
									onClick={onBulkDelete}
									className={`${styles.bulkActionButton} ${styles.deleteButton}`}
									disabled={isLoadingBulkOperation || selectedProductsCount === 0}
									title={
										isLoadingBulkOperation
											? "Выполняется операция..."
											: selectedProductsCount === 0
											? "Не выбрано ни одного товара"
											: "Удалить выбранные товары"
									}
								>
									🗑️ Удалить выбранные
								</button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
