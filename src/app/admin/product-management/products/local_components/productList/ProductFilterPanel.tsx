// src/app/admin/product-management/items/local_components/productList/ProductFilterPanel.tsx

import React, { useState, useCallback, useEffect, memo, useMemo } from "react";
import type { Category } from "@/lib/types";
import SelectWithSearchAndPagination, { Option } from "./SelectWithSearchAndPagination";

type Props = {
	categories: Category[];
	brands: string[];
	// Эти пропсы используются для начального значения
	search: string;
	setSearch: (val: string) => void;
	categoryFilter: string;
	setCategoryFilter: (val: string) => void;
	brandFilter: string;
	setBrandFilter: (val: string) => void;
	onlyStale: boolean;
	setOnlyStale: (val: boolean) => void;
	resetFilters: () => void;
};

function ProductFilterPanel({
	categories,
	brands,
	search,
	setSearch,
	categoryFilter,
	setCategoryFilter,
	brandFilter,
	setBrandFilter,
	onlyStale,
	setOnlyStale,
	resetFilters,
}: Props) {
	const [localSearch, setLocalSearch] = useState(search);

	// Синхронизируем локальное состояние, если родитель обновляет search
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

	// Преобразуем категории для универсального селекта
	const categoryOptions: Option[] = useMemo(() => {
		return categories.map((cat) => ({
			id: cat.id.toString(),
			title: cat.title,
			productCount: cat.productCount,
		}));
	}, [categories]);

	// Преобразуем бренды (строки) в формат Option
	const brandOptions: Option[] = useMemo(() => {
		return brands.map((brand) => ({
			id: brand,
			title: brand,
		}));
	}, [brands]);

	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
			<div className="flex gap-2">
				<input
					type="text"
					placeholder="Поиск по названию, артикулу, бренду..."
					value={localSearch}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					className="border border-black/10 p-2 rounded"
				/>
				<button onClick={handleSearchClick} className="px-3 py-2 bg-blue-600 text-white rounded">
					Искать
				</button>
			</div>

			{/* Селект для категорий */}
			<SelectWithSearchAndPagination options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} placeholder="Все категории" />

			{/* Селект для брендов */}
			<SelectWithSearchAndPagination options={brandOptions} value={brandFilter} onChange={setBrandFilter} placeholder="Все бренды" />

			<label className="flex items-center gap-2 text-sm">
				<input type="checkbox" checked={onlyStale} onChange={handleOnlyStaleChange} />
				Показать только устаревшие
			</label>

			<button onClick={resetFilters} className="px-3 py-1 text-sm border-red-500 text-red-500 rounded hover:bg-red-50 transition">
				Сбросить фильтры
			</button>
		</div>
	);
}

export default memo(ProductFilterPanel);
