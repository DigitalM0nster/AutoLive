"use client";

import { useRef, useState } from "react";
import Loading from "@/components/ui/loading/Loading";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/toastService";

export default function ImportPricelist() {
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<any[][] | null>(null);
	const [columns, setColumns] = useState<Record<string, number>>({
		sku: -1,
		title: -1,
		price: -1,
		brand: -1,
		category: -1,
	});
	const [loading, setLoading] = useState(false);
	const [totalRows, setTotalRows] = useState<number | null>(null);

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const FIELDS = [
		{ label: "Артикул (SKU)", key: "sku" },
		{ label: "Название", key: "title" },
		{ label: "Цена", key: "price" },
		{ label: "Бренд", key: "brand" },
		{ label: "Категория", key: "category" },
	];

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) {
			showErrorToast("Выберите файл для загрузки");
			return;
		}

		const allowedTypes = ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
		if (!allowedTypes.includes(file.type)) {
			showErrorToast("Неверный формат файла. Поддерживаются только .xls и .xlsx");
			return;
		}

		setLoading(true);
		setTotalRows(null);

		const formData = new FormData();
		formData.append("file", file);

		try {
			const res = await fetch("/api/products/import-preview", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) throw new Error("Ошибка при получении превью");

			const data = await res.json();
			setPreview(data.rows);
			setTotalRows(data.rows.length);
			showSuccessToast(`Файл загружен. Строк: ${data.rows.length}`);
		} catch (error: any) {
			showErrorToast("Ошибка при загрузке превью");
		} finally {
			setLoading(false);
		}
	};

	const handleImport = async () => {
		if (!file) {
			showErrorToast("Файл не выбран");
			return;
		}

		const formData = new FormData();
		formData.append("file", file);
		formData.append("columns", JSON.stringify(columns));

		setLoading(true);

		try {
			const res = await fetch("/api/products/import", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) throw new Error("Ошибка при импорте");

			const result = await res.json();
			showSuccessToast(`Импорт завершён: ${result.created} новых, ${result.updated} обновлено`);
		} catch (error: any) {
			showErrorToast("Ошибка при импорте");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="relative border p-4 mb-6">
			{loading && <Loading />}

			<h2 className="text-lg font-bold mb-4">Загрузка прайс-листа</h2>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<label
						htmlFor="file-upload"
						className={`relative flex border-2 border-dashed rounded-md text-center p-6 transition cursor-pointer min-h-[160px] ${
							file ? "border-green-400 bg-green-50 hover:bg-green-100" : "border-gray-300 hover:bg-gray-50"
						}`}
					>
						<input ref={fileInputRef} type="file" id="file-upload" accept=".xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />

						{file ? (
							<div className="flex flex-col items-center gap-2">
								<span className="text-3xl">📄</span>
								<p className="font-medium text-green-700">Выбран файл:</p>
								<p className="text-sm text-green-800">{file.name}</p>
							</div>
						) : (
							<div className="flex flex-col items-center gap-1">
								<span className="text-4xl text-gray-400">📁</span>
								<p className="text-gray-600">Перетащите файл сюда или нажмите для выбора</p>
								<p className="text-sm text-gray-400">Поддерживаются .xlsx, .xls</p>
							</div>
						)}
					</label>

					{file && (
						<button
							type="button"
							onClick={() => {
								setFile(null);
								setPreview(null);
								setTotalRows(null);
								setColumns({
									sku: -1,
									title: -1,
									price: -1,
									brand: -1,
									category: -1,
								});

								if (fileInputRef.current) {
									fileInputRef.current.value = "";
								}
							}}
							className="text-xs text-red-500 underline hover:text-red-700"
						>
							Очистить файл
						</button>
					)}
				</div>

				<button
					type="submit"
					disabled={loading}
					className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
				>
					{loading && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
					{loading ? "Загрузка..." : "Загрузить"}
				</button>
			</form>

			{preview && (
				<>
					<div className="mt-6">
						<h3 className="font-semibold mb-2">Сопоставьте колонки:</h3>
						<div className="grid grid-cols-1 gap-2 mb-4">
							{FIELDS.map(({ label, key }) => (
								<div key={key} className="flex items-center gap-2">
									<label className="w-32">{label}:</label>
									<select
										value={columns[key]}
										onChange={(e) =>
											setColumns((prev) => ({
												...prev,
												[key]: Number(e.target.value),
											}))
										}
										className="border p-1 rounded"
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
						<h3 className="font-semibold mb-1">Предпросмотр:</h3>
						<table className="table-auto border border-gray-300 text-sm w-full">
							<thead>
								<tr>
									{preview[0].map((_, idx) => (
										<th key={idx} className="border px-2 py-1 bg-gray-100 text-gray-600 font-semibold">
											#{idx + 1}
										</th>
									))}
								</tr>
							</thead>
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

						{totalRows !== null && <p className="text-sm text-gray-500 mt-2">Всего строк: {totalRows}</p>}
					</div>

					<button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition" onClick={handleImport} disabled={loading}>
						{loading ? "Импорт..." : "Импортировать товары"}
					</button>
				</>
			)}
		</div>
	);
}
