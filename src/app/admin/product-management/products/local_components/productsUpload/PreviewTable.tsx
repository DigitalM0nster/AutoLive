// src\app\admin\product-management\products\local_components\productsUpload\PreviewTable.tsx

"use client";

import { useState } from "react";

type FieldKey = "sku" | "title" | "price" | "brand" | "category" | "description" | "image";

type PreviewTableProps = {
	preview: any[][];
	totalRows: number | null;
	columns: Record<FieldKey, number>;
	setColumns: (columns: Record<FieldKey, number>) => void;
	startRow: number;
	setStartRow: (row: number) => void;
};

const REQUIRED_FIELDS: { label: string; key: FieldKey; description: string }[] = [
	{ label: "Бренд", key: "brand", description: "Производитель товара" },
	{ label: "Артикул (SKU)", key: "sku", description: "Уникальный артикул товара" },
	{ label: "Название", key: "title", description: "Название товара" },
	{ label: "Закупочная цена", key: "price", description: "Закупочная цена без наценки" },
];

const OPTIONAL_FIELDS: { label: string; key: FieldKey; description: string }[] = [
	{ label: "Описание", key: "description", description: "Описание товара (необязательно)" },
	{ label: "Категория", key: "category", description: "Название категории" },
	{ label: "Изображение", key: "image", description: "URL картинки или имя файла" },
];

function getExcelColumnName(index: number): string {
	let columnName = "";
	while (index >= 0) {
		columnName = String.fromCharCode((index % 26) + 65) + columnName;
		index = Math.floor(index / 26) - 1;
	}
	return columnName;
}

function getMostCommonColumnCount(preview: any[][]): number {
	const counts: Record<number, number> = {};
	let processed = 0;

	for (const row of preview) {
		if (row.filter((cell) => cell !== null && cell !== undefined && cell !== "").length === 0) continue;

		const length = row.length;
		counts[length] = (counts[length] || 0) + 1;

		processed++;
		if (processed >= 30) break;
	}

	const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
	return sorted.length ? Number(sorted[0][0]) : 0;
}

export default function PreviewTable({ preview, totalRows, columns, setColumns, startRow, setStartRow }: PreviewTableProps) {
	if (!preview) return null;

	const getFieldByIndex = (idx: number): FieldKey | null => {
		const found = Object.entries(columns).find(([, col]) => col === idx);
		return found ? (found[0] as FieldKey) : null;
	};

	const mostCommonColumnCount = getMostCommonColumnCount(preview);

	return (
		<div className="mb-4 overflow-x-auto">
			<h3 className="font-semibold mb-1 mt-6">Предпросмотр и сопоставление колонок:</h3>

			<div className="mb-1">
				<label className="text-sm font-medium mr-1">Начинать импорт с строки №</label>
				<input type="number" min={1} value={startRow} onChange={(e) => setStartRow(Number(e.target.value))} className="border p-1 rounded text-sm mt-1 w-24" />
			</div>
			<table className="table-auto border border-black/10 text-sm w-full min-w-[600px]">
				<thead>
					<tr>
						<th className="bg-gray-100 px-2 py-1 text-center text-[11px] text-gray-500">№</th>
						{[...Array(mostCommonColumnCount)].map((_, idx) => {
							const selectedKey = getFieldByIndex(idx);
							return (
								<th key={idx} className="border border-black/10 px-2 py-1 text-center bg-gray-100">
									<div className="text-[11px] text-gray-500 mb-1">{getExcelColumnName(idx)}</div>
									<select
										value={selectedKey || ""}
										onChange={(e) => {
											const key = e.target.value as FieldKey;
											const updated = { ...columns };

											for (const field of Object.keys(updated) as FieldKey[]) {
												if (updated[field] === idx) updated[field] = -1;
												if (field === key) updated[field] = idx;
											}

											setColumns(updated);
										}}
										className="w-full border border-black/10 rounded px-1 py-0.5 text-xs bg-white text-black"
										title={
											selectedKey ? [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].find((f) => f.key === selectedKey)?.description : "Выберите назначение колонки"
										}
									>
										<option value="">— Не выбрано —</option>
										<optgroup label="Обязательные">
											{REQUIRED_FIELDS.map(({ key, label }) => (
												<option key={key} value={key} disabled={columns[key] !== -1 && columns[key] !== idx}>
													{label}
												</option>
											))}
										</optgroup>
										<optgroup label="Необязательные">
											{OPTIONAL_FIELDS.map(({ key, label }) => (
												<option key={key} value={key} disabled={columns[key] !== -1 && columns[key] !== idx}>
													{label}
												</option>
											))}
										</optgroup>
									</select>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{preview.slice(0, 10).map((row, rowIndex) => {
						const absoluteRow = rowIndex + 1;
						const isStart = startRow === absoluteRow;
						return (
							<tr key={rowIndex} onClick={() => setStartRow(absoluteRow)} className={isStart ? "bg-blue-50 cursor-pointer" : "hover:bg-gray-50 cursor-pointer"}>
								<td className="border border-black/10 px-2 py-1 text-center text-xs bg-gray-50 font-mono text-gray-600">{absoluteRow}</td>
								{[...Array(mostCommonColumnCount)].map((_, cellIndex) => {
									const cell = row[cellIndex];
									const isMatched = Object.values(columns).includes(cellIndex);
									const isActiveCell = isMatched && isStart;
									return (
										<td
											key={cellIndex}
											className={`border border-black/10 px-2 py-1 ${
												isActiveCell ? "bg-yellow-100" : isMatched ? "bg-yellow-50" : isStart ? "bg-blue-100" : ""
											}`}
										>
											{cell ?? ""}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>

			{totalRows !== null && <p className="text-sm text-gray-500 mt-2">Всего строк: {totalRows}</p>}
		</div>
	);
}
