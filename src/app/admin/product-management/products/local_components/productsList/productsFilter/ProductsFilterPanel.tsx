// src\app\admin\product-management\products\local_components\productsList\ProductsFilterPanel.tsx

import React, { useState, useCallback, useEffect, memo, useMemo } from "react";
import type { Category } from "@/lib/types";
import SelectWithSearchAndPagination, { Option } from "./SelectWithSearchAndPagination";
import { Range, getTrackBackground } from "react-range";
import DoubleRangeSlider from "./DoubleRangeSlider";

type Props = {
	categories: Category[];
	brands: string[];
	departments: { id: number; name: string; productCount?: number }[];
	priceMin: number;
	priceMax: number;
	setPriceMin: (val: number) => void;
	setPriceMax: (val: number) => void;
	maxPriceInDB: number;
	search: string;
	setSearch: (val: string) => void;
	categoryFilter: string;
	setCategoryFilter: (val: string) => void;
	brandFilter: string;
	setBrandFilter: (val: string) => void;
	onlyStale: boolean;
	setOnlyStale: (val: boolean) => void;
	departmentFilter: string;
	setDepartmentFilter: (val: string) => void;
	isSuperAdmin: boolean;
	resetFilters: () => void;
};

function ProductsFilterPanel({
	categories,
	brands,
	departments,
	priceMin,
	priceMax,
	setPriceMin,
	setPriceMax,
	maxPriceInDB,
	search,
	setSearch,
	categoryFilter,
	setCategoryFilter,
	brandFilter,
	setBrandFilter,
	onlyStale,
	setOnlyStale,
	departmentFilter,
	setDepartmentFilter,
	isSuperAdmin,
	resetFilters,
}: Props) {
	const [localSearch, setLocalSearch] = useState(search);

	useEffect(() => {
		setLocalSearch(search);
	}, [search]);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearch(e.target.value);
		},
		[setSearch]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				setSearch(localSearch);
			}
		},
		[localSearch, setSearch]
	);

	const handleSearchClick = useCallback(() => {
		setSearch(localSearch);
	}, [localSearch, setSearch]);

	const handleOnlyStaleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setOnlyStale(e.target.checked);
		},
		[setOnlyStale]
	);

	// Категории: все, с productCount
	const categoryOptions: Option[] = useMemo(() => {
		return categories.map((cat) => ({
			id: cat.id.toString(),
			title: cat.title,
			productCount: cat.productCount,
		}));
	}, [categories]);

	// Бренды: только с товарами
	const brandOptions: Option[] = useMemo(() => {
		return brands.map((brand) => ({
			id: brand,
			title: brand,
		}));
	}, [brands]);

	// Отделы: все, с productCount
	const departmentOptions: Option[] = useMemo(() => {
		return departments.map((dep) => ({
			id: dep.id === null ? "__none__" : dep.id.toString(),
			title: dep.name,
			productCount: dep.productCount,
		}));
	}, [departments]);

	return (
		<div className="flex flex-col gap-4 mb-6">
			{/* Поиск + устаревшие */}
			<div className="flex flex-col sm:flex-row sm:items-center gap-4">
				<div className="flex flex-1 gap-2">
					<input
						type="text"
						placeholder="Поиск по названию, артикулу, бренду..."
						value={localSearch}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						className="flex-1 border border-black/10 p-2 rounded text-sm"
					/>
					<button onClick={handleSearchClick} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition">
						Искать
					</button>
				</div>

				<label className="flex items-center gap-2 text-sm">
					<input type="checkbox" checked={onlyStale} onChange={handleOnlyStaleChange} />
					Показать только устаревшие
				</label>
			</div>

			{/* Селекты */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<SelectWithSearchAndPagination options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} placeholder="Все категории" />

				<SelectWithSearchAndPagination options={brandOptions} value={brandFilter} onChange={setBrandFilter} placeholder="Все бренды" />

				{isSuperAdmin && <SelectWithSearchAndPagination options={departmentOptions} value={departmentFilter} onChange={setDepartmentFilter} placeholder="Все отделы" />}
			</div>

			{/* Фильтр по стоимости */}
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

			{/* Сброс */}
			<div className="flex justify-start">
				<button onClick={resetFilters} className="px-4 py-2 border border-red-500 text-red-500 rounded text-sm hover:bg-red-50 transition">
					Сбросить фильтры
				</button>
			</div>
		</div>
	);
}

export default memo(ProductsFilterPanel);
