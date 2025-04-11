// src\app\admin\product-management\categories\local_components\categoryManager\CategoryForm.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";

type Props = {
	initialData: {
		title: string;
		image?: string;
	};
	setFormField: (key: string, value: any) => void;
	setImageFile: (file: File | null) => void;
	submitText: string;
	isStandalone: boolean;
	errors: { title: string; image: string };
	onDeleteImage: () => void;
};

export default function CategoryForm({ initialData, setFormField, setImageFile, submitText, isStandalone, errors, onDeleteImage }: Props) {
	const [formData, setFormData] = useState(initialData);
	const [previewUrl, setPreviewUrl] = useState<string | null>(initialData.image || null);

	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (formData.title !== initialData.title) {
			setFormField("title", formData.title);
		}
	}, [formData.title, setFormField, initialData]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => setPreviewUrl(reader.result as string);
			reader.readAsDataURL(file);
			setImageFile(file);
		}
	};

	const handleImageClick = () => {
		fileInputRef.current?.click();
	};

	const handleRemoveImage = () => {
		onDeleteImage();
		setPreviewUrl(null);
		setImageFile(null);
		setFormField("image", undefined); // если нужно удалить старую картинку на сервере
	};

	return (
		<form className="space-y-6">
			{/* Название */}
			<div className="space-y-1">
				<label className="block text-sm font-medium text-gray-700">Название</label>
				<input
					type="text"
					name="title"
					value={formData.title}
					onChange={handleChange}
					className={`w-full px-4 py-2 rounded-lg border border-black/10${errors.title ? "border-red-500" : "border-gray-300"}`}
				/>
				{errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
			</div>

			{/* Загрузка изображения */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-700">Изображение категории</label>

				<div
					onClick={handleImageClick}
					className="cursor-pointer relative w-40 h-40 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
				>
					{previewUrl ? (
						<>
							<img src={previewUrl} alt="Превью" className="w-full h-full object-cover rounded-lg" />
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleRemoveImage();
								}}
								className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-red-500 group transition"
								title="Удалить изображение"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4 text-gray-600 group-hover:text-white"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
								>
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</>
					) : (
						<span className="text-gray-400 text-sm text-center px-2">Нажмите, чтобы выбрать изображение</span>
					)}
				</div>

				<input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />

				{errors.image && <p className="text-red-500 text-sm">{errors.image}</p>}
			</div>
		</form>
	);
}
