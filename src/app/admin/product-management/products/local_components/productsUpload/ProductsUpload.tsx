// src\app\admin\product-management\products\local_components\productsUpload\ProductsUpload.tsx

"use client";

import { useRef, useState } from "react";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/toastService";
import UploadBox from "./UploadBox";
import PreviewTable from "./PreviewTable";
import MarkupRulesEditor, { MarkupRule, DefaultMarkup } from "./MarkupRulesEditor";
import { OBJECTS_PER_PAGE } from "@/lib/objectsPerPage";
import Loading from "@/components/ui/loading/Loading";
import TableSkeleton from "./TableSkeleton";

export default function ProductsUpload() {
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
	const [currentPage, setCurrentPage] = useState<number>(1);

	const [markupRules, setMarkupRules] = useState<MarkupRule[]>([]);
	const [defaultMarkup, setDefaultMarkup] = useState<DefaultMarkup>({ type: "%", value: 30 });
	const [hasMarkupErrors, setHasMarkupErrors] = useState(false);

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
			setPreview(data.rows);
			setTotalRows(data.total);
			console.log("ВСЕГО ROWS!!!!! ", data.total);
			setCurrentPage(page); // Обновляем текущую страницу
			console.log("страница!!!! ", page);
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
		formData.append("markupRules", JSON.stringify(markupRules));
		formData.append("defaultMarkup", JSON.stringify(defaultMarkup));

		setLoading(true);

		try {
			const res = await fetch("/api/products/import", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) throw new Error("Ошибка при импорте");

			const result = await res.json();
			if (result.missingCategories?.length) {
				showErrorToast(`Не удалось создать категории: ${result.missingCategories.join(", ")}`);
			}
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
			<h2 className="font-semibold mb-1">Загрузка прайс-листа</h2>

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

			{loading ? (
				<TableSkeleton />
			) : (
				preview && (
					<>
						{/* <ColumnMatcher preview={preview} columns={columns} errors={errors} setColumns={setColumns} setErrors={setErrors} /> */}

						<PreviewTable preview={preview} totalRows={totalRows} columns={columns} setColumns={setColumns} />
						{/* Пагинация */}
						<div className="flex items-center justify-between mt-4">
							<button
								className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
								onClick={() => {
									const prevPage = currentPage - 1;
									setCurrentPage(prevPage);
									handlePreviewUpload(file!, prevPage);
								}}
								disabled={currentPage === 1}
							>
								Назад
							</button>

							<p className="text-gray-500">Страница {currentPage}</p>

							<button
								className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
								onClick={() => {
									const nextPage = currentPage + 1;
									setCurrentPage(nextPage);
									handlePreviewUpload(file!, nextPage);
								}}
								disabled={totalRows === null || totalRows <= currentPage * OBJECTS_PER_PAGE}
							>
								Вперёд
							</button>
						</div>

						<MarkupRulesEditor
							rules={markupRules}
							setRules={setMarkupRules}
							defaultMarkup={defaultMarkup}
							setDefaultMarkup={setDefaultMarkup}
							onValidationChange={setHasMarkupErrors}
						/>

						<button
							className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
							onClick={handleImport}
							disabled={loading || hasMarkupErrors}
						>
							{loading ? "Импорт..." : "Импортировать товары"}
						</button>
					</>
				)
			)}
		</div>
	);
}
