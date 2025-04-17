"use client";

import { useState, useEffect } from "react";
import ProductsFilterPanel from "./productsFilter/ProductsFilterPanel";
import ProductsTable from "./productsTable/ProductsTable";
import useProductsFilters from "@/hooks/productsList/useProductsFilters";
import useProductsFetcher from "@/hooks/productsList/useProductsFetcher";
import useDebounce from "@/hooks/useDebounce";
import { useAuthStore } from "@/store/authStore";
import type { Product, Category, EditableProduct } from "@/lib/types";
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

	const { products, setProducts, cursor, setCursor, loading, fetchProducts } = useProductsFetcher();

	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [selectedProductIds, setSelectedProductIds] = useState<(number | string)[]>([]);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	// 🔁 Перезагрузка товаров при изменении фильтров
	useEffect(() => {
		setProducts([]);
		setCursor(null);

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

		if (user?.role === "superadmin") {
			if (departmentFilter && departmentFilter !== "__all__") {
				if (departmentFilter === "__none__") {
					params.append("withoutDepartment", "true");
				} else {
					params.append("departmentId", departmentFilter);
				}
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

	const handleLoadMore = () => {
		if (!cursor) return;

		const params = new URLSearchParams({
			limit: "10",
			cursor,
			sortBy,
			order: sortOrder,
			priceMin: String(priceMin),
			priceMax: String(priceMax),
		});
		if (debouncedSearch) params.append("search", debouncedSearch);
		if (onlyStale) params.append("onlyStale", "true");
		if (brandFilter) params.append("brand", brandFilter);
		if (categoryFilter) params.append("categoryId", categoryFilter);

		if (user?.role === "superadmin") {
			if (departmentFilter && departmentFilter !== "__all__") {
				if (departmentFilter === "__none__") {
					params.append("withoutDepartment", "true");
				} else {
					params.append("departmentId", departmentFilter);
				}
			}
		}

		fetchProducts(params, true);
	};

	function toEditableProduct(product: Product, categories: Category[], departments: { id: number; name: string }[]): EditableProduct {
		return {
			...product,
			isEditing: false,
			categoryTitle: categories.find((c) => c.id === product.categoryId)?.title || "—",
			department: product.department ? departments.find((d) => d.id === product?.department?.id) : undefined,
		};
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
				onProductUpdate={(updatedProduct) => {
					if (updatedProduct.id === "new") return;
					setProducts((prev) =>
						prev.some((p) => p.id === updatedProduct.id) ? prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)) : [updatedProduct, ...prev]
					);
				}}
				toEditableProduct={(product) => toEditableProduct(product, categories, departments)}
				toProductForm={toProductForm}
			/>

			{products.length > 0 && (
				<ProductsBulkActions
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
