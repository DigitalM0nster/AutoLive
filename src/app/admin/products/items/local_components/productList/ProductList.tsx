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

	useEffect(() => {
		const fetchCategories = async () => {
			const res = await fetch("/api/categories");
			const data = await res.json();
			setCategories(data);
		};
		fetchCategories();
	}, []);

	useEffect(() => {
		setPage(1);
	}, [search, brandFilter, categoryFilter, sortBy, sortOrder, onlyStale]);

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

				const brandSet = new Set<string>(data.products.map((p: Product) => p.brand));
				setBrands([...brandSet]);
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
			<h3 className="text-lg font-semibold mb-4">Список товаров</h3>

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

			<ProductTable products={products} sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort} loading={loading} />

			{totalPages > 1 && (
				<div className="mt-4 flex justify-center gap-2">
					{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
						<button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border ${page === p ? "bg-blue-600 text-white" : "bg-white"}`}>
							{p}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
