"use client";

import { useState, useEffect } from "react";
import styles from "../styles.module.scss";
import Link from "next/link";

export default function ProductsList({ products, sortOption, itemsPerPage, categoryData }) {
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
		<div className={styles.productsList}>
			{displayedProducts.length === 0 ? (
				<div>Нет товаров</div>
			) : (
				displayedProducts.map((product) => (
					<div key={product.id} className={styles.productItem}>
						<div className={styles.topBlock}>
							<Link href={`/service-materials/${categoryData.category.id.toString()}/${product.id.toString()}`} className={styles.imageBlock}>
								<img src={product.image} alt="" />
							</Link>
							<Link href={`/service-materials/${categoryData.category.id.toString()}/${product.id.toString()}`} className={styles.nameBlock}>
								<span>{product.name}</span>
								<span className={styles.hidden}>{product.name}</span> {/* Вторая копия для плавного появления */}
							</Link>
						</div>
						<div className={styles.bottomBlock}>
							<div className={styles.priceBlock}>{product.price} ₽</div>
							<Link href={`/service-materials/${categoryData.category.id.toString()}/${product.id.toString()}`} className={`button ${styles.button}`}>
								Подробнее
							</Link>
						</div>
					</div>
				))
			)}
		</div>
	);
}
