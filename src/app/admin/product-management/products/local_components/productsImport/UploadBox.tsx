// src\app\admin\product-management\products\local_components\productsUpload\UploadBox.tsx
"use client";

import { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";

type UploadBoxProps = {
	file: File | null;
	fileInputRef: RefObject<HTMLInputElement | null>;
	setFile: Dispatch<SetStateAction<File | null>>;
	setPreview: Dispatch<SetStateAction<any[][] | null>>;
	setTotalRows: Dispatch<SetStateAction<number | null>>;
	resetColumns: () => void;
	handlePreviewUpload: (file: File) => void;
};

export default function UploadBox({ file, fileInputRef, setFile, setPreview, setTotalRows, resetColumns, handlePreviewUpload }: UploadBoxProps) {
	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0] || null;
		setFile(selectedFile);

		if (selectedFile) {
			handlePreviewUpload(selectedFile);
		}
	};

	const handleClear = () => {
		setFile(null);
		setPreview(null);
		setTotalRows(null);
		resetColumns();

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	return (
		<div className="pricelistBlock">
			<label htmlFor="file-upload" className={file ? "fileSelected" : ""}>
				<input ref={fileInputRef} type="file" id="file-upload" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileChange} />

				{file ? (
					<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
						<span style={{ fontSize: "32px" }}>📄</span>
						<p style={{ fontWeight: "500", color: "var(--dark-green-color)" }}>Выбран файл:</p>
						<p style={{ fontSize: "14px", color: "var(--dark-green-color)" }}>{file.name}</p>
					</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
						<span style={{ fontSize: "48px", color: "var(--grey2-color)" }}>📁</span>
						<p style={{ color: "var(--text-color)", opacity: "0.6" }}>Перетащите файл сюда или нажмите для выбора</p>
						<p style={{ fontSize: "14px", color: "var(--text-color)", opacity: "0.4" }}>Поддерживаются .xlsx, .xls</p>
					</div>
				)}
			</label>

			{file && (
				<button onClick={handleClear} type="button" className="removeButton">
					Очистить файл
				</button>
			)}
		</div>
	);
}
