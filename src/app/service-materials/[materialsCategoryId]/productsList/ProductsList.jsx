"use client";

import { useState, useEffect } from "react";
import styles from "../styles.module.scss";

export default function ProductsList({ products, sortOption, itemsPerPage }) {
	const [displayedProducts, setDisplayedProducts] = useState([]);

	useEffect(() => {
		let sortedProducts = [...products];

		// Сортировка
		if (sortOption === "price_asc") {
			sortedProducts.sort((a, b) => a.price - b.price);
		} else if (sortOption === "price_desc") {
			sortedProducts.sort((a, b) => b.price - a.price);
		} else {
			sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
		}

		// Обрезаем массив по количеству товаров на страницу
		setDisplayedProducts(sortedProducts.slice(0, itemsPerPage));
	}, [products, sortOption, itemsPerPage]);

	return (
		<div className={styles.materialsBlock}>
			{displayedProducts.length === 0 ? <div>Нет товаров</div> : displayedProducts.map((product) => <div key={product.id}>{product.name}</div>)}
		</div>
	);
}
