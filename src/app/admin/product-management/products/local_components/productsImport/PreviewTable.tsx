// src\app\admin\product-management\products\local_components\productsImport\PreviewTable.tsx

"use client";

import DataTable from "./DataTable";
import SettingsBlock from "./SettingsBlock";
import PaginationFooter from "./PaginationFooter";
import MarkupRulesEditor, { DefaultMarkup } from "./MarkupRulesEditor";

type FieldKey = "sku" | "title" | "price" | "brand" | "category" | "description" | "image";

type PreviewTableProps = {
	preview: any[][] | null;
	totalRows: number | null;
	columns: Record<FieldKey, number>;
	setColumns: (columns: Record<FieldKey, number>) => void;
	startRow: number;
	setStartRow: (row: number) => void;
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	// Настройки импорта
	preserveImages: boolean;
	setPreserveImages: (value: boolean) => void;
	isSuperadmin: boolean;
	selectedDepartmentId: number | null;
	setSelectedDepartmentId: (id: number | null) => void;
	availableDepartments: { id: number; name: string }[];
	// Настройки наценки и импорт
	markupRules: any[];
	setMarkupRules: (rules: any[]) => void;
	defaultMarkup: DefaultMarkup;
	setDefaultMarkup: (markup: DefaultMarkup) => void;
	hasMarkupErrors: boolean;
	setHasMarkupErrors: (hasErrors: boolean) => void;
	handleImport: () => void;
	loading: boolean;
};

export default function PreviewTable({
	preview,
	totalRows,
	columns,
	setColumns,
	startRow,
	setStartRow,
	currentPage,
	totalPages,
	onPageChange,
	preserveImages,
	setPreserveImages,
	isSuperadmin,
	selectedDepartmentId,
	setSelectedDepartmentId,
	availableDepartments,
	markupRules,
	setMarkupRules,
	defaultMarkup,
	setDefaultMarkup,
	hasMarkupErrors,
	setHasMarkupErrors,
	handleImport,
	loading,
}: PreviewTableProps) {
	if (!preview) return null;

	return (
		<>
			<div className="pricelistPreviewContainer borderBlock">
				<h2 className="borderBlockHeader">Предпросмотр, сопоставление колонок и настройки импорта:</h2>

				<SettingsBlock
					startRow={startRow}
					setStartRow={setStartRow}
					preserveImages={preserveImages}
					setPreserveImages={setPreserveImages}
					isSuperadmin={isSuperadmin}
					selectedDepartmentId={selectedDepartmentId}
					setSelectedDepartmentId={setSelectedDepartmentId}
					availableDepartments={availableDepartments}
				/>

				<DataTable preview={preview} columns={columns} setColumns={setColumns} startRow={startRow} setStartRow={setStartRow} />

				<PaginationFooter totalRows={totalRows} currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
			</div>

			<div className="pricelistSettingsBlock borderBlock">
				<h3 className="borderBlockHeader">Настройки наценки и импорт</h3>

				<MarkupRulesEditor
					rules={markupRules}
					setRules={setMarkupRules}
					defaultMarkup={defaultMarkup}
					setDefaultMarkup={setDefaultMarkup}
					onValidationChange={setHasMarkupErrors}
				/>

				<button
					className="acceptButton"
					onClick={() => {
						console.log("columns.category", columns);
						handleImport();
					}}
					disabled={loading || hasMarkupErrors}
				>
					{loading ? "Импорт..." : "Импортировать товары"}
				</button>
			</div>
		</>
	);
}
