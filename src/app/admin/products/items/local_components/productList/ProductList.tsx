"use client";

import { useEffect, useState } from "react";
import ProductRow from "./ProductRow";

type Product = {
	id: number;
	sku: string;
	title: string;
	price: number;
	brand: string;
	categoryTitle: string;
};

type Category = {
	id: number;
	title: string;
};

export default function ProductList() {
	const [products, setProducts] = useState<Product[]>([]);
	const [brands, setBrands] = useState<string[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);

	const [search, setSearch] = useState("");
	const [brandFilter, setBrandFilter] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);

	// Загружаем категории один раз
	useEffect(() => {
		const fetchCategories = async () => {
			const res = await fetch("/api/categories");
			const data = await res.json();
			setCategories(data);
		};
		fetchCategories();
	}, []);

	// Загружаем товары при изменении фильтров или страницы
	useEffect(() => {
		const fetchProducts = async () => {
			setLoading(true);

			const params = new URLSearchParams({
				page: page.toString(),
				limit: "10",
			});
			if (brandFilter) params.append("brand", brandFilter);
			if (categoryFilter) params.append("categoryId", categoryFilter);

			try {
				const res = await fetch(`/api/products?${params.toString()}`);
				const data = await res.json();

				const filtered = data.products.filter((p: Product) =>
					search.trim() ? [p.title, p.sku, p.brand, p.categoryTitle].join(" ").toLowerCase().includes(search.toLowerCase()) : true
				);

				setProducts(filtered);
				setTotalPages(data.totalPages);

				// обновляем список брендов по результатам страницы
				const uniqueBrands = [...new Set(data.products.map((p: Product) => p.brand))];
				setBrands(uniqueBrands);
			} catch (error) {
				console.error("Ошибка при загрузке товаров", error);
			} finally {
				setLoading(false);
			}
		};

		fetchProducts();
	}, [page, brandFilter, categoryFilter, search]);

	return (
		<div className="mt-8">
			<h3 className="text-lg font-semibold mb-4">Список товаров</h3>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
				<input type="text" placeholder="Поиск по названию, артикулу, бренду..." value={search} onChange={(e) => setSearch(e.target.value)} className="border p-2 rounded" />

				<select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border p-2 rounded">
					<option value="">Все категории</option>
					{categories.map((cat) => (
						<option key={cat.id} value={cat.id.toString()}>
							{cat.title}
						</option>
					))}
				</select>

				<select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="border p-2 rounded">
					<option value="">Все бренды</option>
					{brands.map((brand) => (
						<option key={brand}>{brand}</option>
					))}
				</select>
			</div>

			{loading ? (
				<p className="text-gray-500 text-sm">Загрузка товаров...</p>
			) : (
				<table className="w-full table-auto text-sm border border-gray-300">
					<thead className="bg-gray-100 text-left">
						<tr>
							<th className="border px-2 py-1">Артикул</th>
							<th className="border px-2 py-1">Название</th>
							<th className="border px-2 py-1">Цена</th>
							<th className="border px-2 py-1">Бренд</th>
							<th className="border px-2 py-1">Категория</th>
							<th className="border px-2 py-1 text-center">Действия</th>
						</tr>
					</thead>
					<tbody>
						{products.length > 0 ? (
							products.map((product) => <ProductRow key={product.id} product={product} />)
						) : (
							<tr>
								<td colSpan={6} className="text-center text-gray-400 py-4">
									Ничего не найдено
								</td>
							</tr>
						)}
					</tbody>
				</table>
			)}

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
