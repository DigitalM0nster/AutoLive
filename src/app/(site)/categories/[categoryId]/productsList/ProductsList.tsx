// src\app\products\[categoryId]\productsList\ProductsList.tsx

"use client";

import { useState, useEffect, useRef } from "react";
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

	// Создаем массивы ref'ов для каждого товара
	const marqueeTitleRefs = useRef<(HTMLDivElement | null)[]>([]);
	const marqueeSkuRefs = useRef<(HTMLDivElement | null)[]>([]);
	const marqueeBrandRefs = useRef<(HTMLDivElement | null)[]>([]);
	const spanTitleRefs = useRef<(HTMLSpanElement | null)[]>([]);
	const skuRefs = useRef<(HTMLSpanElement | null)[]>([]);
	const brandRefs = useRef<(HTMLSpanElement | null)[]>([]);

	const [isMarqueeTitleLong, setIsMarqueeTitleLong] = useState<boolean[]>([]);
	const [isMarqueeSkuLong, setIsMarqueeSkuLong] = useState<boolean[]>([]);
	const [isMarqueeBrandLong, setIsMarqueeBrandLong] = useState<boolean[]>([]);

	// Проверяем длину текста для каждого товара
	useEffect(() => {
		setTimeout(() => {
			const titleLongStates: boolean[] = [];
			const skuLongStates: boolean[] = [];
			const brandLongStates: boolean[] = [];

			displayedProducts.forEach((_, index) => {
				const spanTitle = spanTitleRefs.current[index];
				const marqueeTitle = marqueeTitleRefs.current[index];
				const sku = skuRefs.current[index];
				const marqueeSku = marqueeSkuRefs.current[index];
				const brand = brandRefs.current[index];
				const marqueeBrand = marqueeBrandRefs.current[index];

				// Проверяем длину названия
				if (spanTitle && marqueeTitle) {
					titleLongStates[index] = spanTitle.offsetWidth > marqueeTitle.offsetWidth;
				} else {
					titleLongStates[index] = false;
				}

				// Проверяем длину артикула
				if (sku && marqueeSku) {
					skuLongStates[index] = sku.offsetWidth > marqueeSku.offsetWidth;
				} else {
					skuLongStates[index] = false;
				}

				// Проверяем длину бренда
				if (brand && marqueeBrand) {
					brandLongStates[index] = brand.offsetWidth > marqueeBrand.offsetWidth;
				} else {
					brandLongStates[index] = false;
				}
			});

			setIsMarqueeTitleLong(titleLongStates);
			setIsMarqueeSkuLong(skuLongStates);
			setIsMarqueeBrandLong(brandLongStates);
		}, 100);
	}, [displayedProducts]);

	useEffect(() => {
		let sortedProducts = [...products];

		if (sortOption === "price_asc") {
			sortedProducts.sort((a, b) => a.price - b.price);
		} else if (sortOption === "price_desc") {
			sortedProducts.sort((a, b) => b.price - a.price);
		} else {
			sortedProducts.sort((a, b) => a.title.localeCompare(b.title));
		}

		setDisplayedProducts(sortedProducts.slice(0, itemsPerPage));
	}, [products, sortOption, itemsPerPage]);

	return (
		<div className={styles.productsList}>
			{displayedProducts.length === 0 ? (
				<div>Нет товаров</div>
			) : (
				displayedProducts.map((product, index) => (
					<Link href={`/products/${product.id}`} key={product.id} className={styles.productItem}>
						<div className={styles.topBlock}>
							<div className={styles.imageBlock}>
								{product.image ? <img src={product.image} alt={product.title} /> : <img className={styles.noImage} src="/images/no-image.png" alt="" />}
							</div>
							<div className={styles.nameBlock}>
								<div className={`${styles.productMarqueeBlock} ${styles.block}`}>
									<div className={styles.descr}>Название:</div>
									<div
										className={styles.marqueeBlock}
										ref={(el) => {
											marqueeTitleRefs.current[index] = el;
										}}
									>
										<span
											ref={(el) => {
												spanTitleRefs.current[index] = el;
											}}
											data-title={product.title}
											className={`${styles.title} ${isMarqueeTitleLong[index] ? styles.long : ""}`}
											style={{ animationDuration: `${product.title.length * 0.1}s` }}
										>
											{product.title}
										</span>
									</div>
								</div>
								<div className={`${styles.productMarqueeBlock} ${styles.block}`}>
									<div className={styles.descr}>Бренд:</div>
									<div
										className={styles.marqueeBlock}
										ref={(el) => {
											marqueeBrandRefs.current[index] = el;
										}}
									>
										<span
											ref={(el) => {
												brandRefs.current[index] = el;
											}}
											data-title={product.brand}
											className={`${styles.brand} ${isMarqueeBrandLong[index] ? styles.long : ""}`}
											style={{ animationDuration: `${product.brand.length * 0.1}s` }}
										>
											{product.brand}
										</span>
									</div>
								</div>
								<div className={`${styles.productMarqueeBlock} ${styles.block}`}>
									<div className={styles.descr}>Артикул:</div>
									<div
										className={styles.marqueeBlock}
										ref={(el) => {
											marqueeSkuRefs.current[index] = el;
										}}
									>
										<span
											ref={(el) => {
												skuRefs.current[index] = el;
											}}
											data-title={product.sku}
											className={`${styles.sku} ${isMarqueeSkuLong[index] ? styles.long : ""}`}
											style={{ animationDuration: `${product.sku.length * 0.1}s` }}
										>
											{product.sku}
										</span>
									</div>
								</div>
								<div className={styles.block}>
									<div className={styles.descr}>Стоимость:</div>
									<span className={styles.price}>{product.price} ₽</span>
								</div>
							</div>
						</div>
						<div className={styles.bottomBlock}>
							{/* <div className={styles.priceBlock}>{product.price} ₽</div> */}
							<div className={`button ${styles.button}`}>Подробнее</div>
						</div>
					</Link>
				))
			)}
		</div>
	);
}
