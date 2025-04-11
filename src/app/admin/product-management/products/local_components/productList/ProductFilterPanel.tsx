// src\app\admin\product-management\products\local_components\productList\ProductFilterPanel.tsx
import { useState } from "react";
import type { Category } from "@/lib/types";
import CategorySelect from "./CategorySelect";

type Props = {
	categories: Category[];
	brands: string[];
	// Эти пропсы теперь будут использоваться только для начального значения
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

export default function ProductFilterPanel({
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

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			setSearch(localSearch); // Обновляем родительское состояние
		}
	};

	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
			<div className="flex gap-2">
				<input
					type="text"
					placeholder="Поиск по названию, артикулу, бренду..."
					value={localSearch}
					onChange={(e) => setLocalSearch(e.target.value)}
					onKeyDown={handleKeyDown}
					className="border border-black/10 p-2 rounded"
				/>
				<button
					onClick={() => {
						setSearch(localSearch);
					}}
					className="px-3 py-2 bg-blue-600 text-white rounded"
				>
					Искать
				</button>
			</div>

			<CategorySelect categories={categories} value={categoryFilter} onChange={setCategoryFilter} />

			<select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="border border-black/10 p-2 rounded">
				<option value="">Все бренды</option>
				{brands.map((brand) => (
					<option key={brand}>{brand}</option>
				))}
			</select>

			<label className="flex items-center gap-2 text-sm">
				<input type="checkbox" checked={onlyStale} onChange={(e) => setOnlyStale(e.target.checked)} />
				Показать только устаревшие
			</label>

			<button onClick={resetFilters} className="px-3 py-1 text-sm border-red-500 text-red-500 rounded hover:bg-red-50 transition">
				Сбросить фильтры
			</button>
		</div>
	);
}
