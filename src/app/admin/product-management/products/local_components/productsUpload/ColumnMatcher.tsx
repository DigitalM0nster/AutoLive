// src\app\admin\product-management\products\local_components\productsUpload\ColumnMatcher.tsx

import { Dispatch, SetStateAction } from "react";
import { AlertCircle } from "lucide-react"; // ← Иконка ошибки

type FieldKey = "sku" | "title" | "price" | "brand" | "category" | "description";

type ColumnMatcherProps = {
	preview: any[][];
	columns: Record<FieldKey, number>;
	errors: Record<string, string>;
	setColumns: Dispatch<SetStateAction<Record<FieldKey, number>>>;
	setErrors: Dispatch<SetStateAction<Record<string, string>>>;
};

const FIELDS: { label: string; key: FieldKey }[] = [
	{ label: "Артикул (SKU)", key: "sku" },
	{ label: "Бренд", key: "brand" },
	{ label: "Название", key: "title" },
	{ label: "Описание", key: "description" },
	{ label: "Цена", key: "price" },
	{ label: "Категория", key: "category" },
];

export default function ColumnMatcher({ preview, columns, errors, setColumns, setErrors }: ColumnMatcherProps) {
	const handleColumnChange = (key: FieldKey, value: number) => {
		setColumns((prev) => {
			const updated = { ...prev, [key]: value };

			// Сбор использованных колонок
			const used: Record<number, string[]> = {};
			for (const [k, v] of Object.entries(updated)) {
				if (v === -1) continue;
				if (!used[v]) used[v] = [];
				used[v].push(k);
			}

			// Проверка ошибок
			const newErrors = { ...errors };
			delete newErrors[key]; // ⛔ Убираем ошибку только у текущего поля

			const requiredFields: FieldKey[] = ["sku", "title", "price", "brand"];

			for (const col in used) {
				const keys = used[col];
				if (keys.length > 1) {
					for (let i = 1; i < keys.length; i++) {
						const conflictKey = keys[i] as FieldKey;
						if (requiredFields.includes(conflictKey)) {
							newErrors[conflictKey] = "Эта колонка уже выбрана для другого поля.";
						}
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
						<div className="flex items-center gap-2 relative">
							<label className={`w-32 ${errors[key] ? "text-red-500" : ""}`}>{label}:</label>
							<select
								value={columns[key]}
								onChange={(e) => handleColumnChange(key, Number(e.target.value))}
								className={`border p-1 rounded w-52 ${errors[key] ? "border-red-500 pr-8" : "border-black/10"}`}
							>
								<option value={-1}>—</option>
								{preview[0].map((_, idx) => (
									<option key={idx} value={idx}>
										Колонка {idx + 1}
									</option>
								))}
							</select>

							{errors[key] && (
								<div className="absolute right-2 text-red-600 group" title={errors[key]}>
									<AlertCircle size={16} />
								</div>
							)}
						</div>
						{errors[key] && <p className="text-red-500 text-xs">{errors[key]}</p>}
					</div>
				))}
			</div>
		</div>
	);
}
