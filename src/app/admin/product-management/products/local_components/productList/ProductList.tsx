// src\app\admin\product-management\products\local_components\productList\ProductList.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import ProductFilterPanel from "./ProductFilterPanel";
import ProductTable from "./ProductTable";
import type { Product, Category } from "@/lib/types";
import useDebounce from "@/hooks/useDebounce";

export default function ProductList() {
	// Состояния для данных
	const [products, setProducts] = useState<Product[]>([]);
	const [brands, setBrands] = useState<string[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [search, setSearch] = useState("");
	// Используем хук дебаунса – задержка 500 мс
	const debouncedSearch = useDebounce(search, 500);

	const [brandFilter, setBrandFilter] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [onlyStale, setOnlyStale] = useState(false);

	// Пагинация с курсором
	const [cursor, setCursor] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Загружаем категории и бренды один раз
	useEffect(() => {
		const fetchInitialData = async () => {
			try {
				const [catRes, brandRes] = await Promise.all([fetch("/api/categories"), fetch("/api/products/get-all-brands")]);
				const [catData, brandData] = await Promise.all([catRes.json(), brandRes.json()]);

				setCategories(catData);
				setBrands(brandData);
			} catch (error) {
				console.error("Ошибка при загрузке категорий и брендов", error);
			}
		};

		fetchInitialData();
	}, []);

	// При изменении фильтров (включая debouncedSearch) сбрасываем список товаров и курсор, чтобы начать сначала
	useEffect(() => {
		setProducts([]);
		setCursor(null);
		fetchProducts();
	}, [debouncedSearch, brandFilter, categoryFilter, sortBy, sortOrder, onlyStale]);

	// Отмена предыдущих запросов при быстром вводе
	const abortControllerRef = useRef<AbortController | null>(null);

	const fetchProducts = async (cursorParam: string | null = null) => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		const controller = new AbortController();
		abortControllerRef.current = controller;

		setLoading(true);
		const params = new URLSearchParams({
			limit: "10",
			sortBy,
			order: sortOrder,
		});
		if (cursorParam) params.append("cursor", cursorParam);
		if (onlyStale) params.append("onlyStale", "true");
		if (brandFilter) params.append("brand", brandFilter);
		if (categoryFilter) params.append("categoryId", categoryFilter);
		// Передаем debouncedSearch, чтобы не отправлять слишком часто запросы
		if (debouncedSearch) params.append("search", debouncedSearch);

		try {
			const res = await fetch(`/api/products?${params.toString()}`, {
				signal: controller.signal,
			});
			const data = await res.json();

			if (cursorParam) {
				setProducts((prev) => [...prev, ...data.products]);
			} else {
				setProducts(data.products);
			}
			setCursor(data.nextCursor);
		} catch (error: any) {
			if (error.name === "AbortError") {
				console.log("Запрос отменён");
			} else {
				console.error("Ошибка при загрузке товаров", error);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleLoadMore = () => {
		if (cursor) {
			fetchProducts(cursor);
		}
	};

	const handleSort = (column: string) => {
		if (sortBy === column) {
			setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(column);
			setSortOrder("asc");
		}
	};

	return (
		<div className="mt-8">
			<ProductFilterPanel
				categories={categories}
				brands={brands}
				search={search}
				setSearch={setSearch}
				categoryFilter={categoryFilter}
				setCategoryFilter={setCategoryFilter}
				brandFilter={brandFilter}
				setBrandFilter={setBrandFilter}
				onlyStale={onlyStale}
				setOnlyStale={setOnlyStale}
				resetFilters={() => {
					setSearch("");
					setBrandFilter("");
					setCategoryFilter("");
					setSortBy("createdAt");
					setSortOrder("desc");
					setOnlyStale(false);
					setProducts([]);
					setCursor(null);
					fetchProducts();
				}}
			/>

			<ProductTable
				products={products}
				sortBy={sortBy}
				sortOrder={sortOrder}
				handleSort={handleSort}
				loading={loading}
				categories={categories}
				onProductUpdate={(updatedProduct) => {
					if (updatedProduct.id === "new") return;

					const cleanedProduct: Product = {
						id: updatedProduct.id,
						sku: updatedProduct.sku,
						title: updatedProduct.title,
						description: updatedProduct.description,
						price: updatedProduct.price,
						brand: updatedProduct.brand,
						image: updatedProduct.image,
						categoryId: updatedProduct.categoryId,
						categoryTitle: updatedProduct.categoryTitle,
						createdAt: updatedProduct.createdAt,
						updatedAt: updatedProduct.updatedAt,
						filters: updatedProduct.filters,
					};

					setProducts((prev) => {
						const exists = prev.some((p) => p.id === cleanedProduct.id);
						if (exists) {
							return prev.map((p) => (p.id === cleanedProduct.id ? cleanedProduct : p));
						}
						return [...prev, cleanedProduct];
					});
				}}
			/>

			{!loading && cursor && (
				<div className="mt-4 flex justify-center">
					<button onClick={handleLoadMore} className="px-4 py-2 rounded bg-blue-600 text-white">
						Загрузить ещё
					</button>
				</div>
			)}
		</div>
	);
}
