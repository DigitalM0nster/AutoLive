// src\app\admin\categories\[id]\edit\CategoryFiltersManager.tsx
"use client";

import { Filter } from "@/lib/types";
import { useState } from "react";
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
};

export default function CategoryFiltersManager({ categoryId, initialFilters }: Props) {
	const [filters, setFilters] = useState<LocalFilter[]>(
		initialFilters.map((f) => ({
			...f,
			changed: false,
			values: f.values.map((v) => ({ ...v })),
		}))
	);
	const [message, setMessage] = useState("");
	const [newTitle, setNewTitle] = useState("");

	const validate = () => {
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

	const handleFilterChange = (index: number, updated: LocalFilter) => {
		setMessage("");
		setFilters((prev) => prev.map((f, i) => (i === index ? updated : f)));
	};

	const handleFilterDelete = (index: number) => {
		setMessage("");
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
		setMessage("");
		if (!newTitle.trim()) return;
		setFilters((prev) => [...prev, { title: newTitle, type: "select", values: [], isNew: true }]);
		setNewTitle("");
	};

	const saveAll = async () => {
		if (!validate()) return;

		const res = await fetch("/api/filters/save-filters", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ categoryId, filters }),
		});

		const data = await res.json();
		if (res.ok) {
			setMessage("Изменения сохранены");
		} else {
			setMessage(data.error || "Ошибка при сохранении");
		}
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
					!filter.markedForDelete && <FilterItem key={i} filter={filter} onChange={(updated) => handleFilterChange(i, updated)} onDelete={() => handleFilterDelete(i)} />
			)}

			<div className="flex gap-3 items-center pt-4">
				<input
					type="text"
					value={newTitle}
					onChange={(e) => setNewTitle(e.target.value)}
					placeholder="Название нового фильтра"
					className="border px-3 py-2 rounded w-full shadow-sm focus:ring-2 focus:ring-blue-400"
				/>
				<button onClick={addFilter} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow text-sm">
					Добавить
				</button>
			</div>

			<div className="flex justify-end border-t pt-6">
				<button onClick={saveAll} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow transition">
					💾 Сохранить изменения
				</button>
			</div>

			{message && <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded text-sm shadow-sm">{message}</div>}
		</div>
	);
}
