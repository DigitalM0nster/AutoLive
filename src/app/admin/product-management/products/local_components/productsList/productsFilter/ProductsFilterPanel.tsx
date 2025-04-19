"use client";

import React, { useState, useEffect, useMemo } from "react";
import SelectWithSearchAndPagination, { Option } from "./SelectWithSearchAndPagination";
import DoubleRangeSlider from "./DoubleRangeSlider";
import { useProductsStore } from "@/store/productsStore";
import { useAuthStore } from "@/store/authStore";

export default function ProductsFilterPanel() {
	const { departments, categories, loadReferenceData, setPage, fetchProducts, categoryCounts, setCategoryCounts, departmentCounts, setDepartmentCounts } = useProductsStore();
	const { role, user } = useAuthStore();

	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [brandFilter, setBrandFilter] = useState("");
	const [departmentFilter, setDepartmentFilter] = useState("");
	const [onlyStale, setOnlyStale] = useState(false);
	const [priceMin, setPriceMin] = useState(0);
	const [priceMax, setPriceMax] = useState(1000000);
	const [maxPriceInDB, setMaxPriceInDB] = useState(1000000);
	const [brands, setBrands] = useState<string[]>([]);

	useEffect(() => {
		if (role !== "superadmin" && user?.department?.id) {
			setDepartmentFilter(user.department.id.toString());
		}
	}, [role, user]);

	useEffect(() => {
		loadReferenceData();
	}, [loadReferenceData]);

	useEffect(() => {
		const fetchBrandsAndCounts = async () => {
			const params = new URLSearchParams();
			if (search) params.append("search", search);
			if (categoryFilter) params.append("categoryId", categoryFilter);
			if (departmentFilter) params.append("departmentId", departmentFilter);
			if (onlyStale) params.append("onlyStale", "true");

			const res = await fetch("/api/products/filters?" + params.toString());
			if (!res.ok) return;
			const data = await res.json();
			setBrands(data.brands || []);
			setMaxPriceInDB(data.maxPrice || 1000000);
			setCategoryCounts(data.categoryCounts || {});
			setDepartmentCounts(data.departmentCounts || {});
		};

		fetchBrandsAndCounts();
	}, [search, categoryFilter, departmentFilter, onlyStale]);

	useEffect(() => {
		const filters = {
			search,
			categoryId: categoryFilter,
			brand: brandFilter,
			departmentId: departmentFilter,
			onlyStale: onlyStale ? "true" : "",
			priceMin: priceMin.toString(),
			priceMax: priceMax.toString(),
		};
		setPage(1);
		fetchProducts(1, filters);
	}, [search, categoryFilter, brandFilter, departmentFilter, onlyStale, priceMin, priceMax]);

	const resetFilters = () => {
		setSearch("");
		setCategoryFilter("");
		setBrandFilter("");
		setDepartmentFilter("");
		setOnlyStale(false);
		setPriceMin(0);
		setPriceMax(maxPriceInDB);
		setPage(1);
		fetchProducts(1, {});
	};

	const totalCategoryCount = useMemo(() => {
		return Object.values(categoryCounts).reduce((acc, val) => acc + val, 0);
	}, [categoryCounts]);

	const totalDepartmentCount = useMemo(() => {
		return Object.values(departmentCounts).reduce((acc, val) => acc + val, 0);
	}, [departmentCounts]);

	const categoryOptions: Option[] = useMemo(() => {
		const options: Option[] = categories.map((cat) => ({
			id: cat.id.toString(),
			title: cat.title,
			productCount: categoryCounts[cat.id.toString()] || 0,
		}));

		if (categoryCounts["null"]) {
			options.push({
				id: "__none__",
				title: "Без категории",
				productCount: categoryCounts["null"],
			});
		}

		options.unshift({
			id: "",
			title: "Все категории",
			productCount: totalCategoryCount,
		});

		console.log("🧪 departmentCounts", departmentCounts);
		console.log("🧪 departmentOptions", options);

		return options;
	}, [categories, categoryCounts, totalCategoryCount]);

	const departmentOptions: Option[] = useMemo(() => {
		const options = departments.map((dep) => {
			const depIdStr = dep.id?.toString() ?? "__none__";
			return {
				id: depIdStr,
				title: dep.name,
				productCount: departmentCounts[depIdStr] ?? 0,
			};
		});
		options.unshift({
			id: "",
			title: "Все отделы",
			productCount: totalDepartmentCount,
		});
		return options;
	}, [departments, departmentCounts, totalDepartmentCount]);

	const brandOptions: Option[] = useMemo(() => {
		return brands.map((b) => ({ id: b, title: b }));
	}, [brands]);

	return (
		<div className="flex flex-col gap-4 mb-12">
			<div className="flex flex-col sm:flex-row sm:items-center gap-4">
				<div className="flex flex-1 gap-2">
					<input
						type="text"
						placeholder="Поиск по названию, артикулу, бренду..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && setSearch(e.currentTarget.value)}
						className="flex-1 border border-black/10 p-2 rounded text-sm"
					/>
					<button onClick={() => setSearch(search)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition">
						Искать
					</button>
				</div>
				<label className="flex items-center gap-2 text-sm">
					<input type="checkbox" checked={onlyStale} onChange={(e) => setOnlyStale(e.target.checked)} />
					Показать только устаревшие
				</label>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 z-10">
				{role === "superadmin" && (
					<SelectWithSearchAndPagination options={departmentOptions} value={departmentFilter} onChange={setDepartmentFilter} placeholder="Все отделы" />
				)}
				<SelectWithSearchAndPagination options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} placeholder="Все категории" />
				<SelectWithSearchAndPagination options={brandOptions} value={brandFilter} onChange={setBrandFilter} placeholder="Все бренды" />
			</div>

			<DoubleRangeSlider
				min={0}
				max={maxPriceInDB}
				step={100}
				values={[priceMin, priceMax]}
				onChange={([min, max]) => {
					setPriceMin(min);
					setPriceMax(max);
				}}
			/>

			<div className="flex justify-start">
				<button onClick={resetFilters} className="px-4 py-2 border border-red-500 text-red-500 rounded text-sm hover:bg-red-50 transition">
					Сбросить фильтры
				</button>
			</div>
		</div>
	);
}
