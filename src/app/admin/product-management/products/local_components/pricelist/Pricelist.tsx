"use client";

import { useRef, useState } from "react";
import Loading from "@/components/ui/loading/Loading";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/toastService";
import UploadBox from "./UploadBox";
import ColumnMatcher from "./ColumnMatcher";
import PreviewTable from "./PreviewTable";

export default function Pricelist() {
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<any[][] | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [columns, setColumns] = useState<Record<string, number>>({
		brand: -1,
		sku: -1,
		title: -1,
		description: -1,
		price: -1,
		category: -1,
	});
	const [loading, setLoading] = useState(false);
	const [totalRows, setTotalRows] = useState<number | null>(null);
	const [currentPage, setCurrentPage] = useState<number>(1); // Страница

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handlePreviewUpload = async (selectedFile: File, page: number = currentPage) => {
		const allowedTypes = ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
		if (!allowedTypes.includes(selectedFile.type)) {
			showErrorToast("Неверный формат файла. Поддерживаются только .xls и .xlsx");
			return;
		}

		setLoading(true);
		setTotalRows(null);

		const formData = new FormData();
		formData.append("file", selectedFile);

		try {
			const res = await fetch(`/api/products/import-preview?page=${page}`, {
				method: "POST",
				body: formData,
			});

			if (!res.ok) throw new Error("Ошибка при получении превью");

			const data = await res.json();
			setPreview(data.rows); // Устанавливаем строки для текущей страницы
			setTotalRows(data.rows.length); // Всего строк
			setCurrentPage(page); // Обновляем текущую страницу
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

		const newErrors: Record<string, string> = {};
		const requiredFields: (keyof typeof columns)[] = ["sku", "title", "price", "brand"];

		for (const field of requiredFields) {
			if (columns[field] === -1) {
				newErrors[field] = "Это поле обязательно для импорта.";
			}
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors); // ✅ показать ошибки
			showErrorToast("Заполните обязательные поля перед импортом.");
			return;
		}

		setErrors({}); // очистить старые ошибки

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
		<div className="relative border border-black/10 p-4 mb-6">
			{loading && <Loading />}

			<h2 className="text-lg font-bold mb-4">Загрузка прайс-листа</h2>

			<UploadBox
				file={file}
				fileInputRef={fileInputRef}
				setFile={setFile}
				setPreview={setPreview}
				setTotalRows={setTotalRows}
				resetColumns={() =>
					setColumns({
						brand: -1,
						sku: -1,
						title: -1,
						description: -1,
						price: -1,
						category: -1,
					})
				}
				handlePreviewUpload={handlePreviewUpload}
			/>

			{preview && (
				<>
					<ColumnMatcher preview={preview} columns={columns} errors={errors} setColumns={setColumns} setErrors={setErrors} />

					<PreviewTable preview={preview} totalRows={totalRows} />

					<button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition" onClick={handleImport} disabled={loading}>
						{loading ? "Импорт..." : "Импортировать товары"}
					</button>

					{/* Пагинация */}
					<div className="flex justify-between mt-4">
						<button
							className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
							onClick={() => handlePreviewUpload(file!, currentPage - 1)}
							disabled={currentPage === 1}
						>
							Назад
						</button>

						<button
							className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
							onClick={() => handlePreviewUpload(file!, currentPage + 1)}
							disabled={totalRows === null || totalRows <= currentPage * 1000}
						>
							Вперёд
						</button>
					</div>

					<p className="mt-2 text-center text-gray-500">Страница {currentPage}</p>
				</>
			)}
		</div>
	);
}
