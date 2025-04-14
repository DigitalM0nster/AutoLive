// src\app\admin\product-management\products\local_components\productsList\ProductsList.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import ProductsFilterPanel from "./ProductsFilterPanel";
import ProductsTable from "./ProductsTable";
import type { Product, Category } from "@/lib/types";
import useDebounce from "@/hooks/useDebounce";
import { useAuthStore } from "@/store/authStore";

export default function ProductsList() {
	const { user } = useAuthStore();
	// Состояния для данных
	const [products, setProducts] = useState<Product[]>([]);
	const [brands, setBrands] = useState<string[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
	const [search, setSearch] = useState("");
	// Используем хук дебаунса – задержка 500 мс
	const debouncedSearch = useDebounce(search, 500);

	const [brandFilter, setBrandFilter] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [departmentFilter, setDepartmentFilter] = useState("");
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
				const query = user?.role === "superadmin" && departmentFilter ? `?departmentId=${departmentFilter}` : "";

				const filtersRes = await fetch(`/api/products/filters${query}`);
				const filtersData = await filtersRes.json();

				setBrands(filtersData.brands || []);
				setCategories(filtersData.categories);
				setDepartments(filtersData.departments);
			} catch (error) {
				console.error("Ошибка при загрузке фильтров", error);
			}
		};

		fetchInitialData();
	}, [user?.role, departmentFilter]);

	// При изменении фильтров (включая debouncedSearch) сбрасываем список товаров и курсор, чтобы начать сначала
	useEffect(() => {
		setProducts([]);
		setCursor(null);
		fetchProducts();
	}, [debouncedSearch, brandFilter, categoryFilter, departmentFilter, sortBy, sortOrder, onlyStale]);

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
		if (debouncedSearch) params.append("search", debouncedSearch);

		if (user?.role === "superadmin" && departmentFilter !== "") {
			params.append("departmentId", String(parseInt(departmentFilter)));
		}

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
		<>
			<div className="mt-8">
				<ProductsFilterPanel
					categories={categories}
					brands={brands}
					departments={departments}
					search={search}
					setSearch={setSearch}
					categoryFilter={categoryFilter}
					setCategoryFilter={setCategoryFilter}
					brandFilter={brandFilter}
					setBrandFilter={setBrandFilter}
					onlyStale={onlyStale}
					setOnlyStale={setOnlyStale}
					departmentFilter={departmentFilter}
					setDepartmentFilter={setDepartmentFilter}
					isSuperAdmin={user?.role === "superadmin"}
					resetFilters={() => {
						setSearch("");
						setBrandFilter("");
						setCategoryFilter("");
						setDepartmentFilter("");
						setSortBy("createdAt");
						setSortOrder("desc");
						setOnlyStale(false);
						setProducts([]);
						setCursor(null);
						fetchProducts();
					}}
				/>

				<ProductsTable
					products={products}
					sortBy={sortBy}
					sortOrder={sortOrder}
					handleSort={handleSort}
					loading={loading}
					categories={categories}
					departments={departments}
					user={user}
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
							department: updatedProduct.department ?? undefined, // 👈 ДОБАВЬ ЭТО
						};

						setProducts((prev) => {
							const exists = prev.some((p) => p.id === cleanedProduct.id);
							if (exists) {
								return prev.map((p) => (p.id === cleanedProduct.id ? cleanedProduct : p));
							}
							return [cleanedProduct, ...prev];
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
		</>
	);
}
