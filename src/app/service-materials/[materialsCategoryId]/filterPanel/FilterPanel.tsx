// src\app\service-materials\[materialsCategoryId]\filterPanel\FilterPanel.jsx

"use client";

import { useState, useEffect } from "react";
import styles from "./styles.module.scss";
import type { Product, Category } from "@/lib/types";

type FilterPanelProps = {
	products: Product[];
	filters: NonNullable<Category["filters"]>;
	setFilteredProducts: (filtered: Product[]) => void;
};

export default function FilterPanel({ products = [], filters = [], setFilteredProducts }: FilterPanelProps) {
	const minPriceDefault = products.length > 0 ? Math.min(...products.map((p) => p.price)) : 0;
	const maxPriceDefault = products.length > 0 ? Math.max(...products.map((p) => p.price)) : 0;

	const [selectedFilters, setSelectedFilters] = useState<Record<number, number | "">>({});
	const [minPrice, setMinPrice] = useState<number>(minPriceDefault);
	const [maxPrice, setMaxPrice] = useState<number>(maxPriceDefault);
	const [inputMinPrice, setInputMinPrice] = useState<number>(minPriceDefault);
	const [inputMaxPrice, setInputMaxPrice] = useState<number>(maxPriceDefault);

	useEffect(() => {
		applyFilters();
	}, [selectedFilters, minPrice, maxPrice]);

	const applyFilters = () => {
		let filtered = products.filter((product) => product.price >= minPrice && product.price <= maxPrice);

		Object.entries(selectedFilters).forEach(([filterId, valueId]) => {
			if (valueId) {
				filtered = filtered.filter((product) => product.filters?.some((f) => f.filter_id === Number(filterId) && f.value_id === Number(valueId)));
			}
		});

		setFilteredProducts(filtered);
	};

	const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newMinPrice = Number(e.target.value);
		if (!isNaN(newMinPrice) && newMinPrice >= minPriceDefault && newMinPrice <= maxPrice) {
			setMinPrice(newMinPrice);
			setInputMinPrice(newMinPrice);
		}
	};

	const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newMaxPrice = Number(e.target.value);
		if (!isNaN(newMaxPrice) && newMaxPrice >= minPrice && newMaxPrice <= maxPriceDefault) {
			setMaxPrice(newMaxPrice);
			setInputMaxPrice(newMaxPrice);
		}
	};

	const resetFilters = () => {
		setSelectedFilters({});
		setMinPrice(minPriceDefault);
		setMaxPrice(maxPriceDefault);
		setInputMinPrice(minPriceDefault);
		setInputMaxPrice(maxPriceDefault);
		setFilteredProducts(products);
	};

	return (
		<div className={styles.filterPanel}>
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

				{filters.length > 0 &&
					filters.map((filter) => (
						<div key={filter.id} className={styles.filterBlock}>
							<div className={styles.filterName}>{filter.name}</div>
							<select
								value={selectedFilters[filter.id] || ""}
								onChange={(e) =>
									setSelectedFilters({
										...selectedFilters,
										[filter.id]: Number(e.target.value) || "",
									})
								}
							>
								<option value="">Все</option>
								{filter.values.map((value) => (
									<option key={value.id} value={value.id}>
										{value.value}
									</option>
								))}
							</select>
						</div>
					))}
			</div>

			<button
				className={`button ${styles.resetButton}`}
				onClick={resetFilters}
				disabled={Object.keys(selectedFilters).length === 0 && minPrice === minPriceDefault && maxPrice === maxPriceDefault}
			>
				Сбросить фильтры
			</button>
		</div>
	);
}
