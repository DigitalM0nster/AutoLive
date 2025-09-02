// src/app/admin/product-management/products/local_components/productsUpload/ProductsUpload.tsx

"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { showSuccessToast, showErrorToast, showWarningToast } from "@/components/ui/toast/ToastProvider";
import ExcelJS from "exceljs";
import UploadBox from "./UploadBox";
import PreviewTable from "./PreviewTable";
import MarkupRulesEditor, { MarkupRule, DefaultMarkup } from "./MarkupRulesEditor";
import { OBJECTS_PER_PAGE } from "@/lib/objectsPerPage";
import TableSkeleton from "../TableSkeleton";
import type { User } from "@/lib/types";

type Props = {
	user: User;
};

export default function ProductsUpload({ user }: Props) {
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
		image: -1,
	});
	const [startRow, setStartRow] = useState(1); // по умолчанию с 1-й строки
	const [loading, setLoading] = useState(false);
	const [totalRows, setTotalRows] = useState<number | null>(null);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [preserveImages, setPreserveImages] = useState(true);
	const [markupRules, setMarkupRules] = useState<MarkupRule[]>([]);
	const [defaultMarkup, setDefaultMarkup] = useState<DefaultMarkup>({ type: "%", value: 30 });
	const [hasMarkupErrors, setHasMarkupErrors] = useState(false);

	const isSuperadmin = user.role === "superadmin";
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(isSuperadmin ? null : user.department?.id ?? null);
	const [availableDepartments, setAvailableDepartments] = useState<{ id: number; name: string }[]>([]);

	const [progress, setProgress] = useState<number>(0);

	useEffect(() => {
		if (isSuperadmin) {
			fetch("/api/departments")
				.then((res) => res.json())
				.then((data) => {
					setAvailableDepartments(data);
				})
				.catch((err) => {
					console.error("Ошибка загрузки отделов", err);
					showErrorToast("Не удалось загрузить отделы");
				});
		}
	}, [isSuperadmin]);

	const totalPages = totalRows !== null ? Math.ceil(totalRows / OBJECTS_PER_PAGE) : 0;

	async function asyncPool<T, R>(poolLimit: number, array: T[], iteratorFn: (item: T, index: number) => Promise<R>): Promise<R[]> {
		const ret: Promise<R>[] = [];
		const executing: Promise<void>[] = [];

		for (let i = 0; i < array.length; i++) {
			const item = array[i];
			const p = Promise.resolve().then(() => iteratorFn(item, i));
			ret.push(p);

			if (poolLimit <= array.length) {
				const e = p.then(() => {});
				e.then(() => {
					const index = executing.indexOf(e);
					if (index !== -1) executing.splice(index, 1);
				});
				executing.push(e);
			}
		}
		return Promise.all(ret);
	}

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

	const parseExcelFile = async (file: File): Promise<any[][]> => {
		const buffer = await file.arrayBuffer();
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer);

		const worksheet = workbook.worksheets[0];

		const rows: any[][] = [];
		worksheet.eachRow((row) => {
			if (Array.isArray(row.values)) {
				rows.push(row.values.slice(1)); // пропускаем первую ячейку
			} else {
				// если объект — преобразуем в массив
				const ordered = Object.values(row.values);
				rows.push(ordered.slice(0)); // либо slice(1), если надо
			}
		});

		return rows;
	};

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

		if (isSuperadmin && !selectedDepartmentId) {
			showErrorToast("Суперадмин должен выбрать отдел для импорта.");
			return;
		}

		const requiredFields: (keyof typeof columns)[] = ["sku", "title", "price", "brand"];
		const newErrors: Record<string, string> = {};

		for (const field of requiredFields) {
			if (columns[field] === -1) newErrors[field] = "Это поле обязательно";
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			showErrorToast("Заполните обязательные поля перед импортом.");
			return;
		}

		setErrors({});
		setLoading(true);
		setProgress(0);

		try {
			const parsedRows = await parseExcelFile(file);
			const filtered = parsedRows.slice(Math.max(startRow - 1, 0));
			const chunkSize = 1000;
			const totalChunks = Math.ceil(filtered.length / chunkSize);

			let created = 0;
			let updated = 0;
			let skipped = 0;
			let removedCategories = 0;
			let completed = 0;

			const allUnknownTitles = new Set<string>();
			const allLocalDuplicates = new Set<string>();

			const chunks = Array.from({ length: totalChunks }, (_, i) =>
				filtered.slice(i * chunkSize, (i + 1) * chunkSize).map((row) => row.map((v) => (v === undefined ? null : v)))
			);

			await asyncPool(3, chunks, async (chunk, index) => {
				const res = await fetch("/api/products/import-chunk", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						rows: chunk,
						chunkIndex: index,
						totalChunks,
						columns,
						markupRules,
						defaultMarkup,
						preserveImages,
						departmentId: selectedDepartmentId,
					}),
				});

				if (!res.ok) throw new Error("Ошибка при импорте чанка");

				const result = await res.json();
				created += result.created;
				updated += result.updated;
				skipped += result.skipped;
				removedCategories += result.removedCategoriesCount || 0;

				if (Array.isArray(result.unknownCategoryTitles)) {
					for (const title of result.unknownCategoryTitles) {
						allUnknownTitles.add(title);
					}
				}

				if (Array.isArray(result.localDuplicates)) {
					for (const sku of result.localDuplicates) {
						allLocalDuplicates.add(sku);
					}
				}

				completed++;
				setProgress(Math.round((completed / totalChunks) * 100));
			});

			const unknownTitlesArray = Array.from(allUnknownTitles);
			const duplicatesArray = Array.from(allLocalDuplicates);

			if (unknownTitlesArray.length > 0 || duplicatesArray.length > 0) {
				let message = `Импорт завершён: создано — ${created}, обновлено — ${updated}, пропущено — ${skipped}.`;

				if (unknownTitlesArray.length > 0) {
					message += ` Некоторые товары были загружены без категории: ${unknownTitlesArray.slice(0, 5).join(", ")}`;
					if (unknownTitlesArray.length > 5) message += "…";
				}

				if (duplicatesArray.length > 0) {
					message += ` В файле обнаружены дубликаты (оставлены последние): ${duplicatesArray.slice(0, 5).join(", ")}`;
					if (duplicatesArray.length > 5) message += "…";
				}

				showWarningToast(message);
			} else {
				showSuccessToast(`Импорт завершён: создано — ${created}, обновлено — ${updated}, пропущено — ${skipped}`);
			}
		} catch (err) {
			console.error(err);
			showErrorToast("Ошибка при импорте товаров");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="relative border border-black/10 p-4 mb-6">
			<h2 className="font-semibold mb-1">Загрузка прайс-листа</h2>

			<UploadBox
				file={file}
				fileInputRef={fileInputRef}
				setFile={setFile}
				setPreview={setPreview}
				setTotalRows={setTotalRows}
				resetColumns={() => setColumns({ brand: -1, sku: -1, title: -1, description: -1, price: -1, category: -1, image: -1 })}
				handlePreviewUpload={handlePreviewUpload}
			/>

			{loading ? (
				<TableSkeleton />
			) : (
				preview && (
					<>
						<PreviewTable preview={preview} totalRows={totalRows} columns={columns} setColumns={setColumns} startRow={startRow} setStartRow={setStartRow} />

						{isSuperadmin && (
							<div className="mb-4">
								<label className="text-sm font-medium">Выберите отдел:</label>
								<select
									value={selectedDepartmentId ?? ""}
									onChange={(e) => setSelectedDepartmentId(Number(e.target.value))}
									className="border p-1 rounded text-sm mt-1"
								>
									<option value="">— Не выбран —</option>
									{availableDepartments.map((d) => (
										<option key={d.id} value={d.id}>
											{d.name}
										</option>
									))}
								</select>
							</div>
						)}

						<label className="flex items-center gap-2 text-sm mt-2 mb-4">
							<input type="checkbox" checked={preserveImages} onChange={(e) => setPreserveImages(e.target.checked)} />
							<span>Сохранять изображения у уже существующих товаров</span>
						</label>

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
							onClick={() => {
								console.log("columns.category", columns);
								handleImport();
							}}
							disabled={loading || hasMarkupErrors}
						>
							{loading ? "Импорт..." : "Импортировать товары"}
						</button>
					</>
				)
			)}
			{loading && (
				<div className="w-full bg-gray-200 rounded mt-3 h-3 overflow-hidden relative">
					<div className="bg-green-500 h-full transition-all duration-200" style={{ width: `${progress}%` }} />
					<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-white">{progress}%</span>
				</div>
			)}
		</div>
	);
}
