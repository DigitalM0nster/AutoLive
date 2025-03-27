// src\app\admin\products\categories\CategoryManager.tsx

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CategoryForm from "./CategoryForm";
import CategoryFilters from "./CategoryFilters";

type Props = {
	initialCategory?: {
		id?: number;
		title: string;
		description?: string;
		image?: string;
	};
	initialFilters?: any[];
	isEdit?: boolean;
};

export default function CategoryManager({ initialCategory, initialFilters = [], isEdit = false }: Props) {
	const filtersRef = useRef<{ validateFilters: () => boolean }>(null);

	const router = useRouter();
	const [categoryId, setCategoryId] = useState<number | undefined>(initialCategory?.id);
	const [formData, setFormData] = useState({
		title: initialCategory?.title || "",
		description: initialCategory?.description || "",
		image: initialCategory?.image || undefined,
	});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [filters, setFilters] = useState(initialFilters);
	const [message, setMessage] = useState("");

	// Ошибки для категории
	const [categoryErrors, setCategoryErrors] = useState({
		title: "",
		description: "",
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
			description: "",
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

		if (formData.description && formData.description.length > 255) {
			newCategoryErrors.description = "Описание слишком длинное";
			valid = false;
		}

		setCategoryErrors(newCategoryErrors);
		return valid;
	};

	const uploadImage = async (file: File) => {
		const formData = new FormData();
		formData.append("image", file);

		const res = await fetch("/api/upload-image", {
			method: "POST",
			body: formData,
		});

		const data = await res.json();
		if (!res.ok || !data?.url) {
			throw new Error("Ошибка при загрузке изображения");
		}

		return data.url;
	};

	const saveAll = async () => {
		setMessage("");

		const isFormValid = validateForm();
		const isFiltersValid = filtersRef.current?.validateFilters() ?? true;

		if (!isFormValid || !isFiltersValid) {
			setMessage("Пожалуйста, исправьте ошибки в форме и фильтрах.");
			return;
		}

		let imageUrl = formData.image;

		if (imageFile) {
			try {
				imageUrl = await uploadImage(imageFile);
			} catch (error) {
				setMessage("Ошибка при загрузке изображения");
				return;
			}
		}

		const categoryData = {
			title: formData.title,
			description: formData.description,
			image: imageUrl,
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
			setMessage(data?.error || "Ошибка при сохранении категории");
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
			setMessage(filtersData.error || "Ошибка при сохранении фильтров");
			return;
		}

		setMessage("✅ Все изменения успешно сохранены");
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
				/>
			</div>

			<div className="bg-white p-6 rounded-xl shadow space-y-6 border">
				<CategoryFilters ref={filtersRef} categoryId={categoryId} initialFilters={initialFilters} overrideState={[filters, setFilters]} errors={filterErrors} />
			</div>

			<div className="flex justify-end border-t pt-6">
				<button onClick={saveAll} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow transition">
					💾 Сохранить
				</button>
			</div>

			{message && <div className="text-sm text-center text-green-700 mt-4">{message}</div>}
		</div>
	);
}
