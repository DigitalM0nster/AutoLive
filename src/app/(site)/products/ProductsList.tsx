"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./styles.module.scss";
import type { Product } from "@/lib/types";
import ProductsSkeleton from "./ProductsSkeleton";

interface ProductsListProps {
	searchQuery: string;
}

function formatPrice(value: number): string {
	return `${value.toLocaleString("ru-RU")} ₽`;
}

function pluralPositions(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod100 >= 11 && mod100 <= 14) return "позиций";
	if (mod10 === 1) return "позиция";
	if (mod10 >= 2 && mod10 <= 4) return "позиции";
	return "позиций";
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
		[itemsPerPage],
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery]);

	useEffect(() => {
		fetchProducts(currentPage, searchQuery);
	}, [currentPage, searchQuery, fetchProducts]);

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	const totalPages = Math.ceil(totalProducts / itemsPerPage);

	if (loading) {
		return <ProductsSkeleton />;
	}

	if (products.length === 0) {
		return (
			<div className={styles.emptyState}>
				<p className={styles.emptyTitle}>{searchQuery ? "Ничего не найдено" : "Каталог пока пуст"}</p>
				<p className={styles.emptyText}>
					{searchQuery
						? "Попробуйте другой артикул, бренд или сократите запрос."
						: "Товары скоро появятся — загляните позже или свяжитесь с менеджером."}
				</p>
			</div>
		);
	}

	return (
		<section className={styles.catalogTable} aria-label="Список запчастей">
			<div className={styles.catalogTableHead} aria-hidden="true">
				<span />
				<span>Наименование</span>
				<span>Артикул</span>
				<span>Бренд</span>
				<span>Цена</span>
				<span />
			</div>

			<div className={styles.catalogTableBody}>
				{products.map((product, index) => (
					<Link
						key={product.id}
						href={`/products/${product.id}`}
						className={[styles.catalogTableRow, index === products.length - 1 ? styles.lastRow : ""].filter(Boolean).join(" ")}
					>
						<div className={styles.productMedia}>
							{product.image ? (
								<img src={product.image} alt="" />
							) : (
								<img className={styles.noImage} src="/images/no-image.png" alt="" />
							)}
						</div>

						<div className={styles.productMain}>
							<h3 className={styles.productTitle}>{product.title}</h3>
							{product.categoryTitle ? <span className={styles.productCategory}>{product.categoryTitle}</span> : null}
						</div>

						<div className={styles.productMeta}>
							<div className={styles.productSkuCol}>
								<span className={styles.mobileLabel}>Артикул</span>
								<span className={styles.productSku}>{product.sku}</span>
							</div>

							<div className={styles.productBrandCol}>
								<span className={styles.mobileLabel}>Бренд</span>
								<span className={styles.productBrand}>{product.brand}</span>
							</div>

							<div className={styles.productPriceCol}>
								<span className={styles.mobileLabel}>Цена</span>
								<span className={styles.productPrice}>{formatPrice(product.price)}</span>
							</div>
						</div>

						<div className={styles.productActionCol}>
							<span className={styles.productArrow} aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
									<path d="M9 7H17V15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</span>
						</div>
					</Link>
				))}
			</div>

			<div className={styles.paginationFooter}>
				<div className={styles.resultsBar}>
					<p className={styles.resultsCount}>
						<span className={styles.resultsNumber}>{totalProducts.toLocaleString("ru-RU")}</span> {pluralPositions(totalProducts)}
						{searchQuery ? (
							<span className={styles.resultsQuery}>
								{" "}
								по запросу «<span>{searchQuery}</span>»
							</span>
						) : null}
					</p>
					{totalPages > 1 ? (
						<p className={styles.resultsPage}>
							Страница {currentPage} из {totalPages}
						</p>
					) : null}
				</div>

				{totalPages > 1 ? (
					<nav className={styles.pagination} aria-label="Навигация по страницам">
					<button type="button" className={styles.paginationButton} onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
						← Назад
					</button>

					{Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
						let page: number;
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
							<button
								key={page}
								type="button"
								className={[styles.paginationButton, currentPage === page ? styles.active : ""].filter(Boolean).join(" ")}
								onClick={() => handlePageChange(page)}
							>
								{page}
							</button>
						);
					})}

					<button
						type="button"
						className={styles.paginationButton}
						onClick={() => handlePageChange(currentPage + 1)}
						disabled={currentPage === totalPages}
					>
						Вперед →
					</button>
				</nav>
				) : null}
			</div>
		</section>
	);
}
