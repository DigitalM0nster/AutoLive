"use client";

import { useState, useEffect } from "react";
import styles from "./styles.module.scss";

export default function FilterPanel({ products = [], filters = [], setFilteredProducts }) {
	// Минимальная и максимальная цена из товаров
	const minPrice = products.length > 0 ? Math.min(...products.map((p) => p.price)) : 0;
	const maxPriceDefault = products.length > 0 ? Math.max(...products.map((p) => p.price)) : 0;

	// Текущее состояние фильтров
	const [selectedFilters, setSelectedFilters] = useState({});
	const [maxPrice, setMaxPrice] = useState(maxPriceDefault);
	const [inputPrice, setInputPrice] = useState(maxPriceDefault); // Поле ввода для цены

	// Применение фильтров при изменении значений
	useEffect(() => {
		applyFilters();
	}, [selectedFilters, maxPrice]);

	// Применение фильтрации товаров
	const applyFilters = () => {
		let filtered = products.filter((product) => product.price >= minPrice && product.price <= maxPrice);

		Object.entries(selectedFilters).forEach(([filterId, valueId]) => {
			if (valueId) {
				filtered = filtered.filter((product) => product.filters?.some((f) => f.filter_id == filterId && f.value_id == valueId));
			}
		});

		setFilteredProducts(filtered);
	};

	// Обновление `maxPrice` через input
	const handleInputChange = (e) => {
		const newPrice = Number(e.target.value);
		if (!isNaN(newPrice) && newPrice >= minPrice && newPrice <= maxPriceDefault) {
			setInputPrice(newPrice);
			setMaxPrice(newPrice);
		}
	};

	// Сброс фильтров
	const resetFilters = () => {
		setSelectedFilters({});
		setMaxPrice(maxPriceDefault);
		setInputPrice(maxPriceDefault);
		setFilteredProducts(products);
	};

	return (
		<div className={styles.filterPanel}>
			{/* Фильтр цены с полем ввода */}
			{products.length > 0 && (
				<div className={styles.filterBlock}>
					<div className={styles.filterName}>Цена</div>
					<div className={styles.priceInputWrapper}>
						<input type="number" value={inputPrice} onChange={handleInputChange} className={styles.priceInput} min={minPrice} max={maxPriceDefault} />
					</div>
					<div className={styles.sliderWrapper}>
						<span className={styles.minPrice}>{minPrice} руб.</span>
						<input
							type="range"
							min={minPrice}
							max={maxPriceDefault}
							step={0.01}
							value={maxPrice}
							onChange={(e) => {
								setMaxPrice(Number(e.target.value));
								setInputPrice(Number(e.target.value));
							}}
							className={styles.slider}
						/>
						<span className={styles.maxPrice}>{maxPriceDefault} руб.</span>
					</div>
				</div>
			)}

			{/* Фильтры */}
			{filters.length > 0 &&
				filters.map((filter) => (
					<div key={filter.id} className={styles.filterBlock}>
						<div className={styles.filterName}>{filter.name}</div>
						<select value={selectedFilters[filter.id] || ""} onChange={(e) => setSelectedFilters({ ...selectedFilters, [filter.id]: e.target.value })}>
							<option value="">Все</option>
							{filter.values.map((value) => (
								<option key={value.id} value={value.id}>
									{value.value}
								</option>
							))}
						</select>
					</div>
				))}

			{/* Кнопка "Сбросить фильтры" */}
			<button className={`button ${styles.resetButton}`} onClick={resetFilters} disabled={Object.keys(selectedFilters).length === 0 && maxPrice === maxPriceDefault}>
				Сбросить фильтры
			</button>
		</div>
	);
}
