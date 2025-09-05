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

export default function ProductsImport({ user }: Props) {
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
		<div className="tableContent">
			<div className="pricelistImportContainer borderBlock">
				<h2 className="borderBlockHeader">Загрузка прайс-листа</h2>

				<UploadBox
					file={file}
					fileInputRef={fileInputRef}
					setFile={setFile}
					setPreview={setPreview}
					setTotalRows={setTotalRows}
					resetColumns={() => setColumns({ brand: -1, sku: -1, title: -1, description: -1, price: -1, category: -1, image: -1 })}
					handlePreviewUpload={handlePreviewUpload}
				/>
			</div>

			<PreviewTable
				preview={preview}
				totalRows={totalRows}
				columns={columns}
				setColumns={setColumns}
				startRow={startRow}
				setStartRow={setStartRow}
				currentPage={currentPage}
				totalPages={totalPages}
				onPageChange={(page) => {
					setCurrentPage(page);
					handlePreviewUpload(file!, page);
				}}
				preserveImages={preserveImages}
				setPreserveImages={setPreserveImages}
				isSuperadmin={isSuperadmin}
				selectedDepartmentId={selectedDepartmentId}
				setSelectedDepartmentId={setSelectedDepartmentId}
				availableDepartments={availableDepartments}
				// Передаем функции и данные для блока настроек
				markupRules={markupRules}
				setMarkupRules={setMarkupRules}
				defaultMarkup={defaultMarkup}
				setDefaultMarkup={setDefaultMarkup}
				hasMarkupErrors={hasMarkupErrors}
				setHasMarkupErrors={setHasMarkupErrors}
				handleImport={handleImport}
				loading={loading}
			/>
		</div>
	);
}
