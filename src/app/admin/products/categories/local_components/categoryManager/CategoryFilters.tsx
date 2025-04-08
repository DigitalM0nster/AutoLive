// src\app\admin\products\categories\create\components\categoryManager\CategoryFilters.tsx
"use client";

import { Filter } from "@/lib/types";
import { useState, forwardRef, useImperativeHandle, Dispatch, SetStateAction } from "react";
import FilterItem from "./FilterItem";
import { SlidersHorizontal } from "lucide-react";

interface LocalFilterValue {
	id?: number;
	value: string;
	isNew?: boolean;
	markedForDelete?: boolean;
	changed?: boolean;
	error?: string;
}

interface LocalFilter {
	id?: number;
	title: string;
	type: "select" | "multi" | "range" | "boolean";
	values: LocalFilterValue[];
	isNew?: boolean;
	markedForDelete?: boolean;
	changed?: boolean;
	error?: string;
}

type Props = {
	categoryId: number;
	initialFilters: Filter[];
	overrideState?: [LocalFilter[], Dispatch<SetStateAction<LocalFilter[]>>];
	errors: { [key: string]: string };
};

// 👇 добавляем forwardRef и реф-хендлинг
const CategoryFilters = forwardRef(function CategoryFilters({ categoryId, initialFilters, overrideState, errors }: Props, ref) {
	const [localState, setLocalState] = useState<LocalFilter[]>(
		initialFilters.map((f) => ({
			...f,
			changed: false,
			values: f.values.map((v) => ({ ...v })),
		}))
	);

	const [filters, setFilters] = overrideState || [localState, setLocalState];

	const validate = (): boolean => {
		let hasError = false;
		const titles = new Set<string>();

		const validated = filters.map((filter) => {
			let error = "";
			if (!filter.title.trim()) {
				error = "Название обязательно";
				hasError = true;
			} else if (filter.title.length < 2 || filter.title.length > 100) {
				error = "Название должно быть от 2 до 100 символов";
				hasError = true;
			} else if (titles.has(filter.title.trim())) {
				error = "Фильтры с одинаковыми названиями недопустимы";
				hasError = true;
			} else {
				titles.add(filter.title.trim());
			}

			const valuesSet = new Set<string>();
			const valuesValidated = filter.values.map((v) => {
				let valError = "";
				if (!v.value.trim()) {
					valError = "Значение обязательно";
					hasError = true;
				} else if (valuesSet.has(v.value.trim())) {
					valError = "Значения не должны повторяться";
					hasError = true;
				} else if (filter.type === "range" && isNaN(Number(v.value))) {
					valError = "Для диапазона допускаются только числа";
					hasError = true;
				} else {
					valuesSet.add(v.value.trim());
				}
				return { ...v, error: valError };
			});

			if (filter.type === "boolean" && filter.values.length > 0) {
				error = "Фильтр типа 'boolean' не должен иметь значения";
				hasError = true;
			}

			if (filter.type === "range" && filter.values.length < 2) {
				error = "Фильтр типа 'range' должен содержать минимум два значения";
				hasError = true;
			}

			return { ...filter, error, values: valuesValidated };
		});

		setFilters(validated);
		return !hasError;
	};

	useImperativeHandle(ref, () => ({
		validateFilters: validate,
	}));

	const handleFilterChange = (index: number, updated: LocalFilter) => {
		setFilters((prev) => prev.map((f, i) => (i === index ? updated : f)));
	};

	const handleFilterDelete = (index: number) => {
		setFilters((prev) => {
			const f = prev[index];
			if (f.isNew) {
				prev.splice(index, 1);
			} else {
				prev[index].markedForDelete = true;
			}
			return [...prev];
		});
	};

	const addFilter = () => {
		setFilters((prev) => [...prev, { title: "", type: "select", values: [], isNew: true }]);
	};

	return (
		<div className="space-y-8">
			<div className="flex items-center gap-3">
				<div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow">
					<SlidersHorizontal className="w-5 h-5" />
				</div>
				<div>
					<h2 className="text-xl font-bold text-gray-800">Фильтры категории</h2>
					<p className="text-sm text-gray-500">Редактируйте или создайте фильтры и их значения</p>
				</div>
			</div>

			{filters.map(
				(filter, i) =>
					!filter.markedForDelete && (
						<FilterItem key={i} filter={filter} onChange={(updated) => handleFilterChange(i, updated)} onDelete={() => handleFilterDelete(i)} errors={errors} />
					)
			)}

			<div className="flex gap-3 items-center pt-4">
				<button type="button" onClick={addFilter} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow text-sm">
					Добавить
				</button>
			</div>
		</div>
	);
});

export default CategoryFilters;
