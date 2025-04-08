"use client";

import { useState } from "react";

const FIELD_NAMES = ["article", "name", "price", "brand", "category"];

export default function ImportPricelist() {
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<any[][] | null>(null);
	const [columns, setColumns] = useState<Record<string, number>>({
		article: -1,
		name: -1,
		price: -1,
		brand: -1,
		category: -1,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) return alert("Выберите файл");

		const formData = new FormData();
		formData.append("file", file);

		const res = await fetch("/api/products/import-preview", {
			method: "POST",
			body: formData,
		});

		const data = await res.json();
		console.log("Ответ от API:", data);
		setPreview(data.rows);
	};

	const handleImport = async () => {
		const formData = new FormData();
		if (file) formData.append("file", file);
		formData.append("columns", JSON.stringify(columns));

		const res = await fetch("/api/products/import", {
			method: "POST",
			body: formData,
		});

		const result = await res.json();
		alert(`Импорт завершён: ${result.created} новых, ${result.updated} обновлено`);
	};

	return (
		<div className="border p-4 mb-6">
			<h2 className="text-lg font-bold mb-2">Загрузка прайс-листа</h2>
			<form onSubmit={handleSubmit} className="space-y-4">
				<input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
				<button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
					Загрузить
				</button>
			</form>

			{preview && (
				<>
					<div className="mt-6">
						<h3 className="font-semibold mb-2">Сопоставьте колонки:</h3>
						<div className="grid grid-cols-2 gap-2 mb-4">
							{FIELD_NAMES.map((field) => (
								<div key={field} className="flex items-center gap-2">
									<label className="w-24 capitalize">{field}:</label>
									<select
										value={columns[field]}
										onChange={(e) =>
											setColumns((prev) => ({
												...prev,
												[field]: Number(e.target.value),
											}))
										}
										className="border p-1"
									>
										<option value={-1}>—</option>
										{preview[0].map((_, idx) => (
											<option key={idx} value={idx}>
												Колонка {idx + 1}
											</option>
										))}
									</select>
								</div>
							))}
						</div>
					</div>

					<div className="mb-4">
						<h3 className="font-semibold">Предпросмотр:</h3>
						<table className="table-auto border border-gray-300 text-sm">
							<tbody>
								{preview.slice(0, 10).map((row, rowIndex) => (
									<tr key={rowIndex}>
										{row.map((cell, cellIndex) => (
											<td key={cellIndex} className="border px-2 py-1">
												{cell}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleImport}>
						Импортировать товары
					</button>
				</>
			)}
		</div>
	);
}
