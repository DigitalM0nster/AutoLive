// src\app\admin\products\categories\create\components\categoryManager\FilterItem.tsx

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

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

interface LocalFilterValue {
	id?: number;
	value: string;
	isNew?: boolean;
	markedForDelete?: boolean;
	changed?: boolean;
	error?: string;
}

type FilterItemProps = {
	filter: LocalFilter;
	onChange: (filter: LocalFilter) => void;
	onDelete: () => void;
};

export default function FilterItem({ filter, onChange, onDelete }: FilterItemProps) {
	const [open, setOpen] = useState(true);

	const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange({ ...filter, title: e.target.value, changed: true, error: "" });
	};

	const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		onChange({ ...filter, type: e.target.value as any, changed: true, error: "" });
	};

	const handleValueChange = (index: number, value: string) => {
		const updatedValues = [...filter.values];
		updatedValues[index] = {
			...updatedValues[index],
			value,
			changed: true,
			error: "",
		};
		onChange({ ...filter, values: updatedValues });
	};

	const addValue = () => {
		onChange({
			...filter,
			values: [...filter.values, { value: "", isNew: true }],
		});
	};

	const deleteValue = (index: number) => {
		const updated = [...filter.values];
		if (updated[index].isNew) {
			updated.splice(index, 1);
		} else {
			updated[index].markedForDelete = true;
		}
		onChange({ ...filter, values: updated });
	};

	return (
		<div className="border rounded-xl shadow-sm bg-white overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition" onClick={() => setOpen((prev) => !prev)}>
				<div className="flex items-center gap-2">
					{open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
					<span className="font-medium text-gray-800">{filter.title || "Без названия"}</span>
					{filter.error && <span className="text-xs text-red-600 ml-2">({filter.error})</span>}
				</div>
				<button
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
					className="text-red-500 hover:text-red-700"
				>
					<Trash2 className="w-4 h-4" />
				</button>
			</div>

			{open && (
				<div className="px-4 pb-4 space-y-4">
					{/* Название фильтра */}
					<div className="space-y-1">
						<label className="block text-sm font-medium text-gray-700">Название фильтра</label>
						<input
							type="text"
							value={filter.title}
							onChange={handleTitleChange}
							className={`border rounded px-3 py-2 w-full shadow-sm focus:ring-2 focus:ring-blue-400 ${filter.error ? "border-red-500" : "border-gray-300"}`}
						/>
						{filter.error && <p className="text-red-500 text-sm">{filter.error}</p>}
					</div>

					{/* Тип фильтра */}
					<div className="space-y-1">
						<label className="block text-sm font-medium text-gray-700">Тип фильтра</label>
						<select
							value={filter.type}
							onChange={handleTypeChange}
							className={`border rounded px-3 py-2 w-full shadow-sm ${filter.error ? "border-red-500" : "border-gray-300"}`}
						>
							<option value="select">select</option>
							<option value="multi">multi</option>
							<option value="range">range</option>
							<option value="boolean">boolean</option>
						</select>
						{filter.error && <p className="text-red-500 text-sm">{filter.error}</p>}
					</div>

					{/* Значения */}
					{filter.type !== "boolean" && (
						<div className="space-y-1">
							<label className="block text-sm font-medium text-gray-700">Значения</label>
							<ul className="space-y-2">
								{filter.values.map(
									(v, vi) =>
										!v.markedForDelete && (
											<li key={vi} className="flex items-center gap-2">
												<input
													type="text"
													value={v.value}
													onChange={(e) => handleValueChange(vi, e.target.value)}
													className={`border rounded px-3 py-1 w-full text-sm ${v.error ? "border-red-500" : "border-gray-300"}`}
												/>
												{v.error && <p className="text-red-500 text-xs">{v.error}</p>}
												<button type="button" onClick={() => deleteValue(vi)} className="text-red-500 hover:text-red-700">
													×
												</button>
											</li>
										)
								)}
							</ul>
							<button type="button" onClick={addValue} className="text-green-600 hover:underline text-sm mt-1">
								➕ Добавить значение
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
