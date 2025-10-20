// src\app\service-materials\[materialsCategoryId]\filterPanel\FilterPanel.tsx

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./styles.module.scss";
import type { Product, Category } from "@/lib/types";
import { useUiStore } from "@/store/uiStore";

type FilterPanelProps = {
	products: Product[];
	filters: NonNullable<Category["filters"]>;
	setFilteredProducts: (filtered: Product[]) => void;
};

export default function FilterPanel({ products = [], filters = [], setFilteredProducts }: FilterPanelProps) {
	const minPriceDefault = products.length > 0 ? Math.min(...products.map((p) => p.price)) : 0;
	const maxPriceDefault = products.length > 0 ? Math.max(...products.map((p) => p.price)) : 0;
	const { headerHeight } = useUiStore();
	const [selectedFilters, setSelectedFilters] = useState<Record<number, number | "" | number[] | { min?: number; max?: number }>>({});
	const [selectedBrand, setSelectedBrand] = useState<string>("");
	const [minPrice, setMinPrice] = useState<number>(minPriceDefault);
	const [maxPrice, setMaxPrice] = useState<number>(maxPriceDefault);
	const [inputMinPrice, setInputMinPrice] = useState<number>(minPriceDefault);
	const [inputMaxPrice, setInputMaxPrice] = useState<number>(maxPriceDefault);

	// Получаем уникальные бренды из товаров
	const uniqueBrands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort();

	// Используем useCallback для оптимизации
	const applyFilters = useCallback(() => {
		let filtered = products.filter((product) => product.price >= minPrice && product.price <= maxPrice);

		// Фильтрация по бренду
		if (selectedBrand) {
			filtered = filtered.filter((product) => product.brand === selectedBrand);
		}

		Object.entries(selectedFilters).forEach(([filterId, filterValue]) => {
			if (filterValue) {
				const filterIdNum = Number(filterId);

				// Обрабатываем разные типы фильтров
				if (Array.isArray(filterValue)) {
					// Множественный выбор - товар должен иметь хотя бы одно из выбранных значений
					if (filterValue.length > 0) {
						filtered = filtered.filter((product) => product.filters?.some((f) => f.filterId === filterIdNum && filterValue.includes(f.valueId)));
					}
				} else if (typeof filterValue === "object" && filterValue !== null) {
					// Диапазон - проверяем min и max значения
					const rangeFilter = filterValue as { min?: number; max?: number };
					if (rangeFilter.min !== undefined || rangeFilter.max !== undefined) {
						filtered = filtered.filter((product) => {
							const productFilterValues = product.filters?.filter((f) => f.filterId === filterIdNum);
							if (!productFilterValues || productFilterValues.length === 0) return false;

							// Проверяем, что хотя бы одно значение товара попадает в диапазон
							return productFilterValues.some((f) => {
								const value = Number(f.value);
								if (isNaN(value)) return false; // Пропускаем нечисловые значения

								const minOk = rangeFilter.min === undefined || value >= rangeFilter.min;
								const maxOk = rangeFilter.max === undefined || value <= rangeFilter.max;
								return minOk && maxOk;
							});
						});
					}
				} else {
					// Обычный выбор (select, boolean)
					filtered = filtered.filter((product) => product.filters?.some((f) => f.filterId === filterIdNum && f.valueId === Number(filterValue)));
				}
			}
		});

		setFilteredProducts(filtered);
	}, [products, selectedFilters, selectedBrand, minPrice, maxPrice, setFilteredProducts]);

	// Используем useRef для отслеживания предыдущих значений
	const prevValuesRef = useRef({
		products: products,
		selectedFilters: selectedFilters,
		selectedBrand: selectedBrand,
		minPrice: minPrice,
		maxPrice: maxPrice,
	});

	useEffect(() => {
		const prevValues = prevValuesRef.current;

		// Проверяем, изменились ли значения
		const hasChanged =
			prevValues.products !== products ||
			prevValues.selectedFilters !== selectedFilters ||
			prevValues.selectedBrand !== selectedBrand ||
			prevValues.minPrice !== minPrice ||
			prevValues.maxPrice !== maxPrice;

		if (hasChanged) {
			applyFilters();
			// Обновляем ref с новыми значениями
			prevValuesRef.current = {
				products: products,
				selectedFilters: selectedFilters,
				selectedBrand: selectedBrand,
				minPrice: minPrice,
				maxPrice: maxPrice,
			};
		}
	}, [products, selectedFilters, selectedBrand, minPrice, maxPrice, applyFilters]);

	// Используем useCallback для resetFilters
	const resetFilters = useCallback(() => {
		setSelectedFilters({});
		setSelectedBrand("");
		setMinPrice(minPriceDefault);
		setMaxPrice(maxPriceDefault);
		setInputMinPrice(minPriceDefault);
		setInputMaxPrice(maxPriceDefault);
		setFilteredProducts(products);
	}, [minPriceDefault, maxPriceDefault, products, setFilteredProducts]);

	// Используем useCallback для обработчиков изменения цены
	const handleMinPriceChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newMinPrice = Number(e.target.value);
			if (!isNaN(newMinPrice) && newMinPrice >= minPriceDefault && newMinPrice <= maxPrice) {
				setMinPrice(newMinPrice);
				setInputMinPrice(newMinPrice);
			}
		},
		[minPriceDefault, maxPrice]
	);

	const handleMaxPriceChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newMaxPrice = Number(e.target.value);
			if (!isNaN(newMaxPrice) && newMaxPrice >= minPrice && newMaxPrice <= maxPriceDefault) {
				setMaxPrice(newMaxPrice);
				setInputMaxPrice(newMaxPrice);
			}
		},
		[minPrice, maxPriceDefault]
	);

	// Используем useCallback для изменения выбранных фильтров
	const handleFilterChange = useCallback((filterId: number, value: string) => {
		setSelectedFilters((prev) => ({
			...prev,
			[filterId]: Number(value) || "",
		}));
	}, []);

	// Обработчик для множественного выбора
	const handleMultiSelectChange = useCallback((filterId: number, valueId: number, checked: boolean) => {
		setSelectedFilters((prev) => {
			const currentValues = Array.isArray(prev[filterId]) ? (prev[filterId] as number[]) : [];
			if (checked) {
				return {
					...prev,
					[filterId]: [...currentValues, valueId],
				};
			} else {
				return {
					...prev,
					[filterId]: currentValues.filter((id) => id !== valueId),
				};
			}
		});
	}, []);

	// Обработчик для диапазона
	const handleRangeChange = useCallback((filterId: number, type: "min" | "max", value: string) => {
		setSelectedFilters((prev) => {
			const currentRange =
				typeof prev[filterId] === "object" && prev[filterId] !== null && !Array.isArray(prev[filterId]) ? (prev[filterId] as { min?: number; max?: number }) : {};
			return {
				...prev,
				[filterId]: {
					...currentRange,
					[type]: value ? Number(value) : undefined,
				},
			};
		});
	}, []);

	// Обработчик для изменения бренда
	const handleBrandChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedBrand(e.target.value);
	}, []);

	return (
		<div className={styles.filterPanel} style={{ top: headerHeight + 20 + "px" }}>
			<div className={styles.filterContent}>
				{products.length > 0 && (
					<div className={styles.filterBlock}>
						<div className={styles.filterName}>Цена</div>
						<div className={styles.priceInputs}>
							<input
								type="number"
								value={inputMinPrice}
								onChange={(e) => setInputMinPrice(Number(e.target.value))}
								onBlur={handleMinPriceChange}
								className={styles.priceInput}
								min={minPriceDefault}
								max={maxPrice}
							/>
							<span>-</span>
							<input
								type="number"
								value={inputMaxPrice}
								onChange={(e) => setInputMaxPrice(Number(e.target.value))}
								onBlur={handleMaxPriceChange}
								className={styles.priceInput}
								min={minPrice}
								max={maxPriceDefault}
							/>
						</div>

						<div className={styles.sliderWrapper}>
							<input
								type="range"
								min={minPriceDefault}
								max={maxPriceDefault}
								step={0.01}
								value={minPrice}
								onChange={handleMinPriceChange}
								className={styles.slider}
							/>
							<input
								type="range"
								min={minPriceDefault}
								max={maxPriceDefault}
								step={0.01}
								value={maxPrice}
								onChange={handleMaxPriceChange}
								className={styles.slider}
							/>
						</div>
						<div className={styles.priceLabels}>
							<span>{minPriceDefault} руб.</span>
							<span>{maxPriceDefault} руб.</span>
						</div>
					</div>
				)}

				{/* Фильтр бренда - всегда присутствует */}
				{uniqueBrands.length > 0 && (
					<div className={styles.filterBlock}>
						<div className={styles.filterName}>Бренд</div>
						<select value={selectedBrand} onChange={handleBrandChange} className={styles.brandSelect}>
							<option value="">Все бренды</option>
							{uniqueBrands.map((brand) => (
								<option key={brand} value={brand}>
									{brand}
								</option>
							))}
						</select>
					</div>
				)}

				{filters.length > 0 &&
					filters.map((filter) => (
						<div key={filter.id} className={styles.filterBlock}>
							<div className={styles.filterName}>{filter.title}</div>

							{/* Единственный выбор */}
							{filter.type === "select" && (
								<select
									value={typeof selectedFilters[filter.id] === "number" ? selectedFilters[filter.id].toString() : ""}
									onChange={(e) => handleFilterChange(filter.id, e.target.value)}
								>
									<option value="">Все</option>
									{filter.values.map((value) => (
										<option key={value.id} value={value.id}>
											{value.value}
										</option>
									))}
								</select>
							)}

							{/* Множественный выбор */}
							{filter.type === "multi_select" && (
								<div className={styles.multiSelect}>
									{filter.values.map((value) => (
										<label key={value.id} className={styles.checkboxLabel}>
											<input
												type="checkbox"
												checked={Array.isArray(selectedFilters[filter.id]) ? (selectedFilters[filter.id] as number[]).includes(value.id) : false}
												onChange={(e) => handleMultiSelectChange(filter.id, value.id, e.target.checked)}
											/>
											<span>{value.value}</span>
										</label>
									))}
								</div>
							)}

							{/* Диапазон */}
							{filter.type === "range" && (
								<div className={styles.rangeFilter}>
									<div className={styles.rangeLabel}>
										{filter.title} {filter.unit && `(${filter.unit})`}
									</div>
									<div className={styles.rangeInputs}>
										<input
											type="number"
											placeholder="От"
											value={
												typeof selectedFilters[filter.id] === "object" && selectedFilters[filter.id] !== null && !Array.isArray(selectedFilters[filter.id])
													? (selectedFilters[filter.id] as { min?: number; max?: number }).min || ""
													: ""
											}
											onChange={(e) => handleRangeChange(filter.id, "min", e.target.value)}
											className={styles.rangeInput}
										/>
										<span className={styles.rangeSeparator}>-</span>
										<input
											type="number"
											placeholder="До"
											value={
												typeof selectedFilters[filter.id] === "object" && selectedFilters[filter.id] !== null && !Array.isArray(selectedFilters[filter.id])
													? (selectedFilters[filter.id] as { min?: number; max?: number }).max || ""
													: ""
											}
											onChange={(e) => handleRangeChange(filter.id, "max", e.target.value)}
											className={styles.rangeInput}
										/>
										{filter.unit && <span className={styles.rangeUnit}>{filter.unit}</span>}
									</div>
								</div>
							)}

							{/* Да/Нет */}
							{filter.type === "boolean" && (
								<select
									value={typeof selectedFilters[filter.id] === "number" ? selectedFilters[filter.id].toString() : ""}
									onChange={(e) => handleFilterChange(filter.id, e.target.value)}
								>
									<option value="">Все</option>
									{filter.values.map((value) => (
										<option key={value.id} value={value.id}>
											{value.value}
										</option>
									))}
								</select>
							)}
						</div>
					))}
			</div>

			<button
				className={`button ${styles.resetButton}`}
				onClick={resetFilters}
				disabled={Object.keys(selectedFilters).length === 0 && selectedBrand === "" && minPrice === minPriceDefault && maxPrice === maxPriceDefault}
			>
				Сбросить фильтры
			</button>
		</div>
	);
}
