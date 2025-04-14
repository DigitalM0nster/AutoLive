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
		<div className="space-y-2">
			<label
				htmlFor="file-upload"
				className={`relative flex border-2 border-dashed rounded-md text-center p-6 transition cursor-pointer min-h-[160px] ${
					file ? "border-green-400 bg-green-50 hover:bg-green-100" : "border-gray-300 hover:bg-gray-50"
				}`}
			>
				<input ref={fileInputRef} type="file" id="file-upload" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

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
				<button onClick={handleClear} type="button" className="text-xs text-red-500 underline hover:text-red-700">
					Очистить файл
				</button>
			)}
		</div>
	);
}
