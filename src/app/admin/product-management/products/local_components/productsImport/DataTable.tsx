"use client";

import { memo } from "react";

type FieldKey = "sku" | "title" | "price" | "brand" | "category" | "description" | "image";

type DataTableProps = {
	preview: any[][] | null;
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

const DataTable = memo(function DataTable({ preview, columns, setColumns, startRow, setStartRow }: DataTableProps) {
	if (!preview) return null;

	const getFieldByIndex = (idx: number): FieldKey | null => {
		const found = Object.entries(columns).find(([, col]) => col === idx);
		return found ? (found[0] as FieldKey) : null;
	};

	const mostCommonColumnCount = getMostCommonColumnCount(preview);

	return (
		<table className="table">
			<thead>
				<tr>
					<th>№</th>
					{[...Array(mostCommonColumnCount)].map((_, idx) => {
						const selectedKey = getFieldByIndex(idx);
						return (
							<th key={idx}>
								<div>{getExcelColumnName(idx)}</div>
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
									title={selectedKey ? [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].find((f) => f.key === selectedKey)?.description : "Выберите назначение колонки"}
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
						<tr key={rowIndex} onClick={() => setStartRow(absoluteRow)}>
							<td>{absoluteRow}</td>
							{[...Array(mostCommonColumnCount)].map((_, cellIndex) => {
								const cell = row[cellIndex];
								const isMatched = Object.values(columns).includes(cellIndex);
								const isActiveCell = isMatched && isStart;
								let backgroundColor = "";
								if (isActiveCell) backgroundColor = "rgba(16, 185, 129, 0.2)";
								else if (isMatched) backgroundColor = "rgba(16, 185, 129, 0.1)";
								else if (isStart) backgroundColor = "rgba(59, 130, 246, 0.1)";

								return (
									<td key={cellIndex} style={{ padding: "4px 8px", backgroundColor }}>
										{cell ?? ""}
									</td>
								);
							})}
						</tr>
					);
				})}
			</tbody>
		</table>
	);
});

export default DataTable;
