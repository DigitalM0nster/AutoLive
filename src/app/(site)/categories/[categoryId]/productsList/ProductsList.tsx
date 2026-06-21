"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import styles from "../styles.module.scss";
import type { Product } from "@/lib/types";

type ProductsListProps = {
	products: Product[];
	sortOption: string;
	itemsPerPage: number;
	categoryTitle: string;
};

function formatPrice(value: number): string {
	return `${value.toLocaleString("ru-RU")} ₽`;
}

function normalizeBrand(brand?: string | null): string | null {
	const value = brand?.trim();
	if (!value || value.toLowerCase() === "unknown") return null;
	return value;
}

function getDescriptionExcerpt(description?: string | null): string | null {
	const clean = description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
	if (!clean) return null;
	return clean.length <= 96 ? clean : `${clean.slice(0, 96).trim()}…`;
}

function getFilterTags(product: Product, limit = 3): string[] {
	const tags = product.filters?.map((filter) => filter.value).filter(Boolean) ?? [];
	return [...new Set(tags)].slice(0, limit);
}

function ProductArrow() {
	return (
		<span className={styles.productArrow} aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
				<path d="M9 7H17V15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</span>
	);
}

export default function ProductsList({ products, sortOption, itemsPerPage, categoryTitle }: ProductsListProps) {
	const [visibleCount, setVisibleCount] = useState(itemsPerPage);

	useEffect(() => {
		setVisibleCount(itemsPerPage);
	}, [itemsPerPage, products, sortOption]);

	const sortedProducts = useMemo(() => {
		const list = [...products];

		if (sortOption === "price_asc") {
			list.sort((a, b) => a.price - b.price);
		} else if (sortOption === "price_desc") {
			list.sort((a, b) => b.price - a.price);
		} else {
			list.sort((a, b) => a.title.localeCompare(b.title, "ru"));
		}

		return list;
	}, [products, sortOption]);

	const displayedProducts = sortedProducts.slice(0, visibleCount);
	const hasMore = visibleCount < sortedProducts.length;

	if (products.length === 0) {
		return (
			<div className={styles.emptyState}>
				<p className={styles.emptyTitle}>Ничего не найдено</p>
				<p className={styles.emptyText}>По выбранным фильтрам в категории «{categoryTitle}» нет подходящих позиций. Сбросьте фильтры или измените параметры.</p>
			</div>
		);
	}

	return (
		<div className={styles.catalogSection}>
			<div className={styles.productsGrid}>
				{displayedProducts.map((product) => {
					const brand = normalizeBrand(product.brand);
					const excerpt = getDescriptionExcerpt(product.description);
					const tags = getFilterTags(product);

					return (
						<Link href={`/products/${product.id}`} key={product.id} className={styles.productCard}>
							<div className={styles.productMedia}>
								{product.image ?
									<img src={product.image} alt="" />
								:	<span className={styles.productMediaPlaceholder} aria-hidden="true" />}
							</div>

							<div className={styles.productContent}>
								{brand || product.sku ?
									<div className={styles.productMeta}>
										{brand ? <span className={styles.productBrand}>{brand}</span> : null}
										{product.sku ? <span className={styles.productSku}>{product.sku}</span> : null}
									</div>
								:	null}

								<h2 className={styles.productTitle}>{product.title}</h2>

								{excerpt ? <p className={styles.productDesc}>{excerpt}</p> : null}

								{tags.length > 0 ?
									<ul className={styles.productTags}>
										{tags.map((tag) => (
											<li key={tag}>{tag}</li>
										))}
									</ul>
								:	null}
							</div>

							<div className={styles.productFooter}>
								<div className={styles.productPriceBlock}>
									<span className={styles.productPriceLabel}>Цена</span>
									<span className={styles.productPrice}>{formatPrice(product.price)}</span>
								</div>

								<div className={styles.productAction}>
									<span className={styles.productActionText}>Подробнее</span>
									<ProductArrow />
								</div>
							</div>
						</Link>
					);
				})}
			</div>

			{hasMore ? (
				<div className={styles.loadMoreWrap}>
					<button type="button" className={styles.loadMoreButton} onClick={() => setVisibleCount((prev) => prev + itemsPerPage)}>
						Показать ещё ({sortedProducts.length - visibleCount})
					</button>
				</div>
			) : null}
		</div>
	);
}
