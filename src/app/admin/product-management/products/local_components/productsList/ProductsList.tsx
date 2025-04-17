"use client";

import { useState, useEffect, useMemo } from "react";
import ProductsFilterPanel from "./productsFilter/ProductsFilterPanel";
import ProductsTable from "./productsTable/ProductsTable";
import useProductsFilters from "@/app/admin/product-management/products/local_components/productsList/hooks/useProductsFilters";
import useProductsFetcher from "@/app/admin/product-management/products/local_components/productsList/hooks/useProductsFetcher";
import useDebounce from "@/hooks/useDebounce";
import { useAuthStore } from "@/store/authStore";
import type { ProductListItem, Category, EditableProduct, Product } from "@/lib/types";
import ProductsBulkActions from "./ProductsBulkActions";

export default function ProductsList() {
	const { user } = useAuthStore();

	const [search, setSearch] = useState("");
	const [brandFilter, setBrandFilter] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [departmentFilter, setDepartmentFilter] = useState("__all__");
	const [onlyStale, setOnlyStale] = useState(false);
	const debouncedSearch = useDebounce(search, 500);

	const { brands, categories, departments, priceMin, setPriceMin, priceMax, setPriceMax, maxPriceInDB } = useProductsFilters({
		brandFilter,
		categoryFilter,
		search,
		onlyStale,
		departmentFilter,
	});

	const { products, setProducts, cursor, setCursor, loading, fetchProducts, total } = useProductsFetcher();

	// paged pagination
	const [currentPage, setCurrentPage] = useState(1);
	const limit = 10; // количество на страницу
	const totalPages = Math.ceil(total / limit);

	const pagesToShow = useMemo<(number | "ellipsis")[]>(() => {
		if (totalPages <= 1) return [];
		const pages = new Set<number>([1, totalPages]);
		for (let i = currentPage - 2; i <= currentPage + 2; i++) {
			if (i > 1 && i < totalPages) pages.add(i);
		}
		const sorted = Array.from(pages).sort((a, b) => a - b);
		const result: (number | "ellipsis")[] = [];
		let prev = 0;
		for (const p of sorted) {
			if (prev && p > prev + 1) result.push("ellipsis");
			result.push(p);
			prev = p;
		}
		return result;
	}, [currentPage, totalPages]);

	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [selectedProductIds, setSelectedProductIds] = useState<(number | string)[]>([]);

	// 🔁 Перезагрузка товаров при изменении фильтров
	useEffect(() => {
		// сбрасываем на первую страницу при любом изменении фильтров
		setCurrentPage(1);
		setProducts([]);

		// собираем все параметры, в том числе page
		const params = new URLSearchParams({
			limit: String(limit),
			page: "1",
			sortBy,
			order: sortOrder,
			priceMin: String(priceMin),
			priceMax: String(priceMax),
		});
		if (debouncedSearch) params.append("search", debouncedSearch);
		if (onlyStale) params.append("onlyStale", "true");
		if (brandFilter) params.append("brand", brandFilter);
		if (categoryFilter) params.append("categoryId", categoryFilter);
		if (user?.role === "superadmin" && departmentFilter !== "__all__") {
			if (departmentFilter === "__none__") {
				params.append("withoutDepartment", "true");
			} else {
				params.append("departmentId", departmentFilter);
			}
		}

		fetchProducts(params);
	}, [debouncedSearch, brandFilter, categoryFilter, departmentFilter, sortBy, sortOrder, onlyStale, priceMin, priceMax]);

	const handleSort = (column: string) => {
		if (sortBy === column) {
			setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(column);
			setSortOrder("asc");
		}
	};

	const handleLoadPage = (page: number) => {
		setCurrentPage(page);
		setProducts([]);

		const params = new URLSearchParams({
			limit: String(limit),
			page: String(page),
			sortBy,
			order: sortOrder,
			priceMin: String(priceMin),
			priceMax: String(priceMax),
		});
		if (debouncedSearch) params.append("search", debouncedSearch);
		if (onlyStale) params.append("onlyStale", "true");
		if (brandFilter) params.append("brand", brandFilter);
		if (categoryFilter) params.append("categoryId", categoryFilter);
		if (user?.role === "superadmin" && departmentFilter !== "__all__") {
			if (departmentFilter === "__none__") {
				params.append("withoutDepartment", "true");
			} else {
				params.append("departmentId", departmentFilter);
			}
		}

		fetchProducts(params).then(({ items, total }) => {
			setProducts(items);
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
	};

	function toEditableProduct(product: Product | EditableProduct): EditableProduct {
		if ((product as EditableProduct).isEditing !== undefined) {
			return product as EditableProduct;
		} else {
			return {
				id: product.id,
				sku: product.sku,
				title: product.title,
				description: product.description,
				price: product.price,
				supplierPrice: product.supplierPrice ?? null,
				brand: product.brand,
				image: product.image ?? null,
				createdAt: product.createdAt,
				updatedAt: product.updatedAt,
				categoryId: product.categoryId,
				departmentId: product.department?.id ?? null,
				categoryTitle: product.categoryTitle,
				department: product.department,
				filters: product.filters,
				isEditing: false,
			};
		}
	}

	function toProductForm(product: EditableProduct) {
		return {
			title: product.title,
			description: product.description || "",
			sku: product.sku,
			supplierPrice: product.supplierPrice?.toString() || "",
			price: product.price.toString(),
			brand: product.brand,
			categoryId: product.categoryId?.toString() || "",
			departmentId: product.department?.id?.toString() || "",
			image: product.image || "",
		};
	}

	return (
		<div className="mt-8">
			<ProductsFilterPanel
				categories={categories}
				brands={brands}
				departments={departments}
				priceMin={priceMin}
				priceMax={priceMax}
				setPriceMin={setPriceMin}
				setPriceMax={setPriceMax}
				maxPriceInDB={maxPriceInDB}
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
					setPriceMin(0);
					setPriceMax(maxPriceInDB);
				}}
			/>

			<ProductsTable
				products={products}
				selectedProductIds={selectedProductIds}
				setSelectedProductIds={setSelectedProductIds}
				sortBy={sortBy}
				sortOrder={sortOrder}
				handleSort={handleSort}
				loading={loading}
				categories={categories}
				departments={departments}
				user={user}
				onProductUpdate={(updatedProduct: EditableProduct) => {
					setProducts((prev) =>
						prev.some((p) => p.id === updatedProduct.id) ? prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)) : [updatedProduct, ...prev]
					);
				}}
				toEditableProduct={toEditableProduct}
				toProductForm={toProductForm}
			/>

			{products.length > 0 && (
				<ProductsBulkActions
					user={user}
					selectedProductIds={selectedProductIds}
					setSelectedProductIds={setSelectedProductIds}
					fetchProducts={() => {
						const params = new URLSearchParams({
							limit: "10",
							sortBy,
							order: sortOrder,
							priceMin: String(priceMin),
							priceMax: String(priceMax),
						});
						if (debouncedSearch) params.append("search", debouncedSearch);
						if (onlyStale) params.append("onlyStale", "true");
						if (brandFilter) params.append("brand", brandFilter);
						if (categoryFilter) params.append("categoryId", categoryFilter);
						if (user?.role === "superadmin" && departmentFilter !== "__all__") {
							if (departmentFilter === "__none__") {
								params.append("withoutDepartment", "true");
							} else {
								params.append("departmentId", departmentFilter);
							}
						}
						setProducts([]);
						setCursor(null);
						fetchProducts(params);
					}}
					buildFilterParams={() => {
						const params = new URLSearchParams({
							allIds: "true",
							sortBy,
							order: sortOrder,
							priceMin: String(priceMin),
							priceMax: String(priceMax),
						});
						if (debouncedSearch) params.append("search", debouncedSearch);
						if (onlyStale) params.append("onlyStale", "true");
						if (brandFilter) params.append("brand", brandFilter);
						if (categoryFilter) params.append("categoryId", categoryFilter);
						if (user?.role === "superadmin" && departmentFilter !== "__all__") {
							if (departmentFilter === "__none__") {
								params.append("withoutDepartment", "true");
							} else {
								params.append("departmentId", departmentFilter);
							}
						}
						return params;
					}}
				/>
			)}

			{!loading && totalPages > 1 && (
				<div className="mt-4 flex items-center justify-center space-x-1">
					{pagesToShow.map((item, idx) =>
						item === "ellipsis" ? (
							<span key={`ellipsis-${idx}`} className="px-2">
								…
							</span>
						) : (
							<button
								key={`page-${item}-${idx}`}
								onClick={() => handleLoadPage(item as number)}
								disabled={item === currentPage}
								className={`px-3 py-1 rounded transition ${item === currentPage ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-black"}`}
							>
								{item}
							</button>
						)
					)}

					<span className="ml-4 text-gray-600">
						Страница {currentPage} из {totalPages}
					</span>
				</div>
			)}
		</div>
	);
}
