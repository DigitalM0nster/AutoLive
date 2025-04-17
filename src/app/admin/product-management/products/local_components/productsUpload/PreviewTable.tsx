// src\app\admin\product-management\products\local_components\productsUpload\PreviewTable.tsx

"use client";

type FieldKey = "sku" | "title" | "price" | "brand" | "category" | "description";

type PreviewTableProps = {
	preview: any[][];
	totalRows: number | null;
	columns: Record<FieldKey, number>;
	setColumns: (columns: Record<FieldKey, number>) => void;
};

const FIELDS: { label: string; key: FieldKey; description: string }[] = [
	{ label: "Артикул (SKU)", key: "sku", description: "Уникальный артикул товара" },
	{ label: "Бренд", key: "brand", description: "Производитель товара" },
	{ label: "Название", key: "title", description: "Название товара" },
	{ label: "Описание", key: "description", description: "Описание товара (необязательно)" },
	{ label: "Цена у поставщика", key: "price", description: "Закупочная цена без наценки" },
	{ label: "Категория", key: "category", description: "Название категории (можно создать)" },
];

export default function PreviewTable({ preview, totalRows, columns, setColumns }: PreviewTableProps) {
	if (!preview) return null;

	const getFieldByIndex = (idx: number): FieldKey | null => {
		const found = Object.entries(columns).find(([, col]) => col === idx);
		return found ? (found[0] as FieldKey) : null;
	};

	return (
		<div className="mb-4">
			<h3 className="font-semibold mb-1 mt-6">Предпросмотр и сопоставление колонок:</h3>

			<table className="table-auto border border-black/10 text-sm w-full">
				<thead>
					<tr>
						{preview[0].map((_, idx) => {
							const selectedKey = getFieldByIndex(idx);

							return (
								<th key={idx} className="border border-black/10 px-2 py-1 text-center bg-gray-100">
									<div className="text-[11px] text-gray-500 mb-1">#{idx + 1}</div>

									<select
										value={selectedKey || ""}
										onChange={(e) => {
											const key = e.target.value as FieldKey;
											const updated = { ...columns };

											// снять старую привязку
											for (const field of Object.keys(updated) as FieldKey[]) {
												if (updated[field] === idx) updated[field] = -1;
												if (field === key) updated[field] = idx;
											}

											setColumns(updated);
										}}
										className="w-full border border-black/10 rounded px-1 py-0.5 text-xs bg-white text-black"
										title={selectedKey ? FIELDS.find((f) => f.key === selectedKey)?.description : "Выберите назначение колонки"}
									>
										<option value="">— Не выбрано —</option>
										{FIELDS.map(({ key, label }) => (
											<option key={key} value={key} disabled={columns[key] !== -1 && columns[key] !== idx}>
												{label}
											</option>
										))}
									</select>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{preview.slice(0, 10).map((row, rowIndex) => (
						<tr key={rowIndex}>
							{row.map((cell, cellIndex) => {
								const isMatched = Object.values(columns).includes(cellIndex);
								return (
									<td key={cellIndex} className={`border border-black/10 px-2 py-1 ${isMatched ? "bg-yellow-50" : ""}`}>
										{cell}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>

			{totalRows !== null && <p className="text-sm text-gray-500 mt-2">Всего строк: {totalRows}</p>}
		</div>
	);
}
