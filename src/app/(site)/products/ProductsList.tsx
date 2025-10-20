// src/app/(site)/products/ProductsList.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./styles.module.scss";
import type { Product } from "@/lib/types";

interface ProductsListProps {
	searchQuery: string;
}

export default function ProductsList({ searchQuery }: ProductsListProps) {
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(20);
	const [totalProducts, setTotalProducts] = useState(0);

	const fetchProducts = useCallback(
		async (page: number = 1, search: string = "") => {
			try {
				setLoading(true);
				const params = new URLSearchParams({
					page: page.toString(),
					limit: itemsPerPage.toString(),
				});

				if (search.trim()) {
					params.append("search", search.trim());
				}

				const response = await fetch(`/api/products/public?${params}`);
				const data = await response.json();

				setProducts(data.products || []);
				setTotalProducts(data.pagination?.total || 0);
			} catch (error) {
				console.error("Ошибка загрузки товаров:", error);
			} finally {
				setLoading(false);
			}
		},
		[itemsPerPage]
	);

	// Загружаем товары при изменении страницы или поиска
	useEffect(() => {
		fetchProducts(currentPage, searchQuery);
	}, [currentPage, searchQuery, fetchProducts]);

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	const totalPages = Math.ceil(totalProducts / itemsPerPage);

	if (loading) {
		return <div className={styles.loading}>Загрузка товаров...</div>;
	}

	if (products.length === 0) {
		return <div className={styles.noResults}>{searchQuery ? "Товары не найдены по заданным критериям" : "Товары не найдены"}</div>;
	}

	return (
		<>
			<div className={styles.productsList}>
				{products.map((product) => (
					<Link key={product.id} href={`/products/${product.id}`} className={styles.productItem}>
						<div className={styles.imageBlock}>
							{product.image ? <img src={product.image} alt={product.title} /> : <img className={styles.noImage} src="/images/no-image.png" alt="Нет изображения" />}
						</div>

						<div className={styles.productInfo}>
							<h3 className={styles.productTitle}>{product.title}</h3>
							<div className={styles.productInfoBlock}>
								<div className={styles.productSku}>{product.sku}</div>
								<div className={styles.productBrand}>{product.brand}</div>
								{product.categoryTitle && <div className={styles.productCategory}>{product.categoryTitle}</div>}
								<div className={styles.productPrice}>{product.price} ₽</div>
							</div>
						</div>
					</Link>
				))}
			</div>

			{/* Пагинация */}
			{totalPages > 1 && (
				<div className={styles.pagination}>
					<button className={styles.paginationButton} onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
						← Назад
					</button>

					<div className={styles.paginationInfo}>
						Страница {currentPage} из {totalPages} (всего товаров: {totalProducts})
					</div>

					{Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
						let page;
						if (totalPages <= 7) {
							page = i + 1;
						} else if (currentPage <= 4) {
							page = i + 1;
						} else if (currentPage >= totalPages - 3) {
							page = totalPages - 6 + i;
						} else {
							page = currentPage - 3 + i;
						}

						return (
							<button key={page} className={`${styles.paginationButton} ${currentPage === page ? styles.active : ""}`} onClick={() => handlePageChange(page)}>
								{page}
							</button>
						);
					})}

					<button className={styles.paginationButton} onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
						Вперед →
					</button>
				</div>
			)}
		</>
	);
}
