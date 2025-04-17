// src/app/admin/product-management/products/local_components/productsUpload/ProductsUpload.tsx

"use client";

import { useRef, useState, useMemo } from "react";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import UploadBox from "./UploadBox";
import PreviewTable from "./PreviewTable";
import MarkupRulesEditor, { MarkupRule, DefaultMarkup } from "./MarkupRulesEditor";
import { OBJECTS_PER_PAGE } from "@/lib/objectsPerPage";
import Loading from "@/components/ui/loading/Loading";
import TableSkeleton from "../TableSkeleton";

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

	// Вычисляем общее число страниц
	const totalPages = totalRows !== null ? Math.ceil(totalRows / OBJECTS_PER_PAGE) : 0;

	// Генерируем массив для рендера: номера страниц и 'ellipsis'
	const pagesToShow: (number | "ellipsis")[] = useMemo(() => {
		if (totalPages <= 1) return [];

		const setPages = new Set<number>();
		setPages.add(1);
		setPages.add(totalPages);
		for (let i = currentPage - 2; i <= currentPage + 2; i++) {
			if (i > 1 && i < totalPages) setPages.add(i);
		}

		const sorted = Array.from(setPages).sort((a, b) => a - b);
		const result: (number | "ellipsis")[] = [];
		let prev = 0;
		for (const p of sorted) {
			if (prev && p > prev + 1) {
				result.push("ellipsis");
			}
			result.push(p);
			prev = p;
		}
		return result;
	}, [currentPage, totalPages]);

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
			setCurrentPage(page);
			showSuccessToast(`Файл загружен. Всего строк: ${data.total}`);
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
			setErrors(newErrors);
			showErrorToast("Заполните обязательные поля перед импортом.");
			return;
		}

		setErrors({});

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
				resetColumns={() => setColumns({ brand: -1, sku: -1, title: -1, description: -1, price: -1, category: -1 })}
				handlePreviewUpload={handlePreviewUpload}
			/>

			{loading ? (
				<TableSkeleton />
			) : (
				preview && (
					<>
						<PreviewTable preview={preview} totalRows={totalRows} columns={columns} setColumns={setColumns} />

						{/* Пагинация */}
						{pagesToShow.length > 0 && (
							<div className="flex items-center justify-center mt-4 space-x-1">
								{pagesToShow.map((item, idx) =>
									item === "ellipsis" ? (
										<span key={`el${idx}`} className="px-2">
											…
										</span>
									) : (
										<button
											key={item}
											onClick={() => {
												if (item !== currentPage) {
													setCurrentPage(item);
													handlePreviewUpload(file!, item);
												}
											}}
											disabled={item === currentPage}
											className={`px-2 py-1 rounded transition ${
												item === currentPage ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-black"
											}`}
										>
											{item}
										</button>
									)
								)}

								<span className="ml-4 text-gray-600">
									Страница {currentPage} из {totalPages}
								</span>
							</div>
						)}

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
