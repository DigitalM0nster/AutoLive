// src\app\admin\product-management\items\local_components\productList\ProductList.tsx

"use client";

import { useEffect, useState } from "react";
import ProductFilterPanel from "./ProductFilterPanel";
import ProductTable from "./ProductTable";
import type { Product, Category } from "@/lib/types";

export default function ProductList() {
	const [products, setProducts] = useState<Product[]>([]);
	const [brands, setBrands] = useState<string[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);

	const [search, setSearch] = useState("");
	const [brandFilter, setBrandFilter] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [onlyStale, setOnlyStale] = useState(false);

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
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

	// Сброс страницы при фильтрах
	useEffect(() => {
		setPage(1);
	}, [search, brandFilter, categoryFilter, sortBy, sortOrder, onlyStale]);

	// Загрузка товаров
	useEffect(() => {
		const fetchProducts = async () => {
			setLoading(true);
			const params = new URLSearchParams({
				page: page.toString(),
				limit: "10",
				sortBy,
				order: sortOrder,
			});

			if (onlyStale) params.append("onlyStale", "true");
			if (search.trim()) params.append("search", search.trim());
			if (brandFilter) params.append("brand", brandFilter);
			if (categoryFilter) params.append("categoryId", categoryFilter);

			try {
				const res = await fetch(`/api/products?${params.toString()}`);
				const data = await res.json();

				setTotalPages(data.totalPages);
				setProducts(data.products);
			} catch (error) {
				console.error("Ошибка при загрузке товаров", error);
			} finally {
				setLoading(false);
			}
		};

		fetchProducts();
	}, [page, brandFilter, categoryFilter, search, sortBy, sortOrder, onlyStale]);

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
				sortBy={sortBy}
				setSortBy={setSortBy}
				sortOrder={sortOrder}
				setSortOrder={setSortOrder}
				resetFilters={() => {
					setSearch("");
					setBrandFilter("");
					setCategoryFilter("");
					setSortBy("createdAt");
					setSortOrder("desc");
					setOnlyStale(false);
					setPage(1);
				}}
			/>
			<ProductTable products={products} sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort} loading={loading} categories={categories} />

			{/* NAV MENU */}
			{totalPages > 1 && (
				<div className="mt-4 flex justify-center gap-2">
					{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
						<button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border border-black/10 ${page === p ? "bg-blue-600 text-white" : "bg-white"}`}>
							{p}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
