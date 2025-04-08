"use client";

import { useRef, useState } from "react";
import Loading from "@/components/ui/loading/Loading";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/toastService";
import UploadBox from "./UploadBox";
import ColumnMatcher from "./ColumnMatcher";
import PreviewTable from "./PreviewTable";

export default function ImportPricelist() {
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<any[][] | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});
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

		// Проверка на наличие ошибок
		if (Object.keys(errors).length > 0) {
			showErrorToast("Исправьте ошибки перед импортом.");
			return;
		}

		// Проверка на заполненность всех полей
		const values = Object.values(columns);
		if (values.includes(-1)) {
			showErrorToast("Все поля должны быть сопоставлены.");
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
				<UploadBox
					file={file}
					fileInputRef={fileInputRef}
					setFile={setFile}
					setPreview={setPreview}
					setTotalRows={setTotalRows}
					resetColumns={() =>
						setColumns({
							sku: -1,
							title: -1,
							price: -1,
							brand: -1,
							category: -1,
						})
					}
				/>

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
					<ColumnMatcher preview={preview} columns={columns} errors={errors} setColumns={setColumns} setErrors={setErrors} />

					<PreviewTable preview={preview} totalRows={totalRows} />

					<button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition" onClick={handleImport} disabled={loading}>
						{loading ? "Импорт..." : "Импортировать товары"}
					</button>
				</>
			)}
		</div>
	);
}
