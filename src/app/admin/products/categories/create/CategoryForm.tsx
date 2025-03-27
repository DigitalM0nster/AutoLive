// src\app\admin\products\categories\CategoryForm.tsx

"use client";

import React, { useState, useEffect } from "react";

type Props = {
	initialData: {
		title: string;
		description?: string;
		image?: string;
	};
	setFormField: (key: string, value: any) => void;
	setImageFile: (file: File | null) => void;
	submitText: string;
	isStandalone: boolean;
	errors: { title: string; description: string; image: string };
};

export default function CategoryForm({ initialData, setFormField, setImageFile, submitText, isStandalone, errors }: Props) {
	const [formData, setFormData] = useState(initialData);

	useEffect(() => {
		if (formData.title !== initialData.title) {
			setFormField("title", formData.title);
		}
		if (formData.description !== initialData.description) {
			setFormField("description", formData.description);
		}
	}, [formData.title, formData.description, setFormField, initialData]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		setImageFile(file);
	};

	return (
		<form className="space-y-6">
			<div className="space-y-1">
				<label className="block text-sm font-medium text-gray-700">Название</label>
				<input
					type="text"
					name="title"
					value={formData.title}
					onChange={handleChange}
					className={`w-full px-4 py-2 rounded-lg border ${errors.title ? "border-red-500" : "border-gray-300"}`}
				/>
				{errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
			</div>

			<div className="space-y-1">
				<label className="block text-sm font-medium text-gray-700">Описание</label>
				<textarea
					name="description"
					value={formData.description || ""}
					onChange={handleChange}
					className={`w-full px-4 py-2 rounded-lg border ${errors.description ? "border-red-500" : "border-gray-300"}`}
				/>
				{errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
			</div>

			<div className="space-y-1">
				<label className="block text-sm font-medium text-gray-700">Изображение (необязательно)</label>
				<input type="file" onChange={handleFileChange} className="w-full px-4 py-2 rounded-lg border border-gray-300" />
			</div>
		</form>
	);
}
