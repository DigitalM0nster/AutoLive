// src\app\service-materials\[materialsCategoryId]\productsList\ProductsList.tsx

"use client";

import { useState, useEffect } from "react";
import styles from "../styles.module.scss";
import Link from "next/link";
import type { Product, Category } from "@/lib/types";

type ProductsListProps = {
	products: Product[];
	sortOption: string;
	itemsPerPage: number;
	categoryData: {
		category: Category;
	};
};

export default function ProductsList({ products, sortOption, itemsPerPage, categoryData }: ProductsListProps) {
	const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);

	useEffect(() => {
		let sortedProducts = [...products];

		if (sortOption === "price_asc") {
			sortedProducts.sort((a, b) => a.price - b.price);
		} else if (sortOption === "price_desc") {
			sortedProducts.sort((a, b) => b.price - a.price);
		} else {
			sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
		}

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
							<Link href={`/service-materials/${categoryData.category.id}/${product.id}`} className={styles.imageBlock}>
								<img src={product.image_url} alt={product.name} />
							</Link>
							<Link href={`/service-materials/${categoryData.category.id}/${product.id}`} className={styles.nameBlock}>
								<span>{product.name}</span>
								<span className={styles.hidden}>{product.name}</span>
							</Link>
						</div>
						<div className={styles.bottomBlock}>
							<div className={styles.priceBlock}>{product.price} ₽</div>
							<Link href={`/service-materials/${categoryData.category.id}/${product.id}`} className={`button ${styles.button}`}>
								Подробнее
							</Link>
						</div>
					</div>
				))
			)}
		</div>
	);
}
