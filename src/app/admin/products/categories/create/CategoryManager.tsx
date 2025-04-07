// src\app\admin\products\categories\CategoryManager.tsx

"use client";

import { useRef, useState } from "react";
import CategoryForm from "./CategoryForm";
import CategoryFilters from "./CategoryFilters";
import { useToast } from "@/components/ui/toast/ToastProvider";

type Props = {
	initialCategory?: {
		id?: number;
		title: string;
		image?: string;
	};
	initialFilters?: any[];
	isEdit?: boolean;
};

export default function CategoryManager({ initialCategory, initialFilters = [], isEdit = false }: Props) {
	const filtersRef = useRef<{ validateFilters: () => boolean }>(null);

	const [categoryId, setCategoryId] = useState<number | undefined>(initialCategory?.id);
	const [formData, setFormData] = useState({
		title: initialCategory?.title || "",
		image: initialCategory?.image || undefined,
	});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [filters, setFilters] = useState(initialFilters);
	const toast = useToast();

	const [shouldDeleteImage, setShouldDeleteImage] = useState(false);

	// Ошибки для категории
	const [categoryErrors, setCategoryErrors] = useState({
		title: "",
		image: "",
	});

	// Ошибки для фильтров
	const [filterErrors, setFilterErrors] = useState({
		title: "",
		type: "",
	});

	const handleFormChange = (key: string, value: any) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
	};

	// Валидация формы категории
	const validateForm = () => {
		let valid = true;
		const newCategoryErrors = {
			title: "",
			image: "",
		};

		if (!formData.title) {
			newCategoryErrors.title = "Название обязательно";
			valid = false;
		}

		if (formData.title && (formData.title.length < 2 || formData.title.length > 100)) {
			newCategoryErrors.title = "Название должно быть от 2 до 100 символов";
			valid = false;
		}

		setCategoryErrors(newCategoryErrors);
		return valid;
	};

	const uploadImage = async (file: File) => {
		const formData = new FormData();
		formData.append("image", file);

		const res = await fetch("/api/upload", {
			method: "POST",
			body: formData,
		});

		const data = await res.json();
		if (!res.ok || !data?.url) {
			throw new Error("Ошибка при загрузке изображения");
		}

		return data.url;
	};

	const [isSaving, setIsSaving] = useState(false);

	const saveAll = async () => {
		if (isSaving) return;
		setIsSaving(true);

		try {
			const isFormValid = validateForm();
			const isFiltersValid = filtersRef.current?.validateFilters() ?? true;

			if (!isFormValid || !isFiltersValid) {
				toast("Пожалуйста, исправьте ошибки в форме и фильтрах.", "error");
				return;
			}

			let imageUrl = formData.image;

			if (imageFile) {
				try {
					imageUrl = await uploadImage(imageFile);
				} catch (error) {
					toast("Ошибка при загрузке изображения", "error");
					return;
				}
			}

			const categoryData = {
				title: formData.title,
				image: shouldDeleteImage ? null : imageUrl,
			};

			const res = await fetch(isEdit ? `/api/categories/${categoryId}` : "/api/categories", {
				method: isEdit ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(categoryData),
			});

			const data = await res.json();

			if (!res.ok || !data?.id) {
				toast("Ошибка при сохранении категории", "error");
				return;
			}

			const id = data.id || categoryId;
			setCategoryId(id);

			const filtersRes = await fetch("/api/filters/save-filters", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ categoryId: id, filters }),
			});
			const filtersData = await filtersRes.json();

			if (!filtersRes.ok) {
				toast("Ошибка при сохранении фильтров", "error");
				return;
			}

			toast("✅ Все изменения успешно сохранены", "success");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-10 px-6 py-10 max-w-4xl mx-auto">
			<div>
				<h1 className="text-3xl font-extrabold text-gray-900 mb-2">{isEdit ? "Редактировать категорию" : "Создание категории"}</h1>
				<p className="text-sm text-gray-500">Управляйте категорией и связанными с ней фильтрами</p>
			</div>

			<div className="bg-white p-6 rounded-xl shadow space-y-6 border">
				<CategoryForm
					initialData={formData}
					setFormField={handleFormChange}
					setImageFile={setImageFile}
					submitText={isEdit ? "💾 Сохранить" : "➕ Создать"}
					isStandalone={false}
					errors={categoryErrors}
					onDeleteImage={() => {
						setFormData((prev) => ({ ...prev, image: undefined }));
						setImageFile(null);
						setShouldDeleteImage(true);
					}}
				/>
			</div>

			{categoryId !== undefined && (
				<div className="bg-white p-6 rounded-xl shadow space-y-6 border">
					<CategoryFilters ref={filtersRef} categoryId={categoryId} initialFilters={initialFilters} overrideState={[filters, setFilters]} errors={filterErrors} />
				</div>
			)}

			<div className="flex justify-end border-t pt-6">
				<button onClick={saveAll} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow transition">
					{isSaving ? "⏳ Сохраняем..." : "💾 Сохранить"}
				</button>
			</div>
		</div>
	);
}
