// src\app\admin\products\items\local_components\importPricelist\ColumnMatcher.tsx

"use client";

import { Dispatch, SetStateAction } from "react";

type FieldKey = "sku" | "title" | "price" | "brand" | "category";

type ColumnMatcherProps = {
	preview: any[][];
	columns: Record<FieldKey, number>;
	errors: Record<string, string>;
	setColumns: Dispatch<SetStateAction<Record<FieldKey, number>>>;
	setErrors: Dispatch<SetStateAction<Record<string, string>>>;
};

const FIELDS: { label: string; key: FieldKey }[] = [
	{ label: "Артикул (SKU)", key: "sku" },
	{ label: "Название", key: "title" },
	{ label: "Цена", key: "price" },
	{ label: "Бренд", key: "brand" },
	{ label: "Категория", key: "category" },
];

export default function ColumnMatcher({ preview, columns, errors, setColumns, setErrors }: ColumnMatcherProps) {
	const handleColumnChange = (key: FieldKey, value: number) => {
		setColumns((prev) => {
			const updated = { ...prev, [key]: value };

			// Собираем, какие колонки где используются
			const used: Record<number, string[]> = {};
			for (const [k, v] of Object.entries(updated)) {
				if (v === -1) continue;
				if (!used[v]) used[v] = [];
				used[v].push(k);
			}

			// Строим ошибки — только если поле не первое
			const newErrors: Record<string, string> = {};
			for (const col in used) {
				const keys = used[col];
				if (keys.length > 1) {
					for (let i = 1; i < keys.length; i++) {
						newErrors[keys[i]] = "Эта колонка уже выбрана для другого поля.";
					}
				}
			}

			setErrors(newErrors);
			return updated;
		});
	};

	return (
		<div className="mt-6">
			<h3 className="font-semibold mb-2">Сопоставьте колонки:</h3>
			<div className="grid grid-cols-1 gap-2 mb-4">
				{FIELDS.map(({ label, key }) => (
					<div key={key} className="flex flex-col gap-1">
						<div className="flex items-center gap-2">
							<label className="w-32">{label}:</label>
							<select
								value={columns[key]}
								onChange={(e) => handleColumnChange(key, Number(e.target.value))}
								className={`border p-1 rounded ${errors[key] ? "border-red-500" : ""}`}
							>
								<option value={-1}>—</option>
								{preview[0].map((_, idx) => (
									<option key={idx} value={idx}>
										Колонка {idx + 1}
									</option>
								))}
							</select>
						</div>
						{errors[key] && <p className="text-red-500 text-xs">{errors[key]}</p>}
					</div>
				))}
			</div>
		</div>
	);
}
