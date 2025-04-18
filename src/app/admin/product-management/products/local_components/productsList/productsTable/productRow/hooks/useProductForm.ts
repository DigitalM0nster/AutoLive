import { useEffect, useState } from "react";
import { EditableProduct, Product, Category, User } from "@/lib/types";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/ToastProvider";

export type ProductFormType = ReturnType<Parameters<typeof useProductForm>[0]["toProductForm"]>;

export function useProductForm({
	product,
	toProductForm,
	toEditableProduct,
	user,
	categories,
	departments,
	setPendingProductData,
	setDuplicateProduct,
	onUpdate,
}: {
	product: EditableProduct;
	toProductForm: (p: EditableProduct) => any;
	toEditableProduct: (p: Product) => EditableProduct;
	user?: User | null;
	categories: Category[];
	departments: { id: number; name: string }[];
	setPendingProductData: (data: EditableProduct | null) => void;
	setDuplicateProduct: (product: EditableProduct | null) => void;
	onUpdate: (updated: EditableProduct) => void;
}) {
	const [form, setForm] = useState(toProductForm(product));
	const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(product.image || null);
	const [allowedCategoryIds, setAllowedCategoryIds] = useState<number[]>([]);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		const fetchAllowedCategories = async () => {
			try {
				const depId = user?.role === "superadmin" ? parseInt(form.departmentId || user.department?.id || "") : user?.department?.id;

				if (!depId || user?.role === "manager") return;

				const res = await fetch(`/api/departments/${depId}`);
				const data = await res.json();
				const categoryIds = (data.allowedCategories || []).map((c: any) => c.category.id);
				setAllowedCategoryIds(categoryIds);
			} catch (err) {
				console.warn("Ошибка загрузки разрешённых категорий:", err);
			}
		};

		fetchAllowedCategories();
	}, [form.departmentId]);

	const validate = () => {
		const validationErrors: typeof errors = {};
		if (!form.title.trim()) validationErrors.title = "Укажите название";
		if (!form.sku.trim()) validationErrors.sku = "Укажите артикул";
		if (!form.brand.trim()) validationErrors.brand = "Укажите бренд";
		if (!form.price || isNaN(parseFloat(form.price))) validationErrors.price = "Некорректная цена";
		if (user?.role === "superadmin" && (!form.departmentId || isNaN(Number(form.departmentId)))) {
			validationErrors.departmentId = "Выберите отдел";
		}

		setErrors(validationErrors);
		return Object.keys(validationErrors).length === 0;
	};

	const handleSave = async () => {
		setIsSaving(true);

		if (!validate()) {
			showErrorToast("Заполните обязательные поля");
			setIsSaving(false);
			return false;
		}

		let imageUrl = form.image;
		if (imageFile) {
			const imageData = new FormData();
			imageData.append("image", imageFile);

			try {
				const uploadRes = await fetch("/api/upload", {
					method: "POST",
					body: imageData,
				});
				const uploadJson = await uploadRes.json();
				imageUrl = uploadJson.url;
			} catch (uploadErr) {
				showErrorToast("Ошибка загрузки изображения");
				setIsSaving(false);
				return false;
			}
		}

		if (form.categoryId && !allowedCategoryIds.includes(parseInt(form.categoryId))) {
			showErrorToast("Выбранная категория не разрешена для отдела. Товар будет создан без категории.");
			form.categoryId = "";
			product.categoryId = null;
		}

		const productData = {
			sku: form.sku,
			title: form.title,
			description: form.description,
			supplierPrice: form.supplierPrice ? parseFloat(form.supplierPrice) : null,
			price: parseFloat(form.price),
			brand: form.brand,
			categoryId: form.categoryId ? parseInt(form.categoryId) : null,
			image: imageUrl,
			...(user?.role === "superadmin" && {
				departmentId: form.departmentId ? parseInt(form.departmentId) : null,
			}),
		};

		const isNew = typeof product.id !== "number";

		if (isNew) {
			try {
				const depId = user?.role === "superadmin" ? productData.departmentId ?? "null" : user?.department?.id ?? "null";
				const excludeId = typeof product.id === "number" ? product.id : undefined;
				const duplicateRes = await fetch(
					`/api/products/check-duplicate?sku=${encodeURIComponent(productData.sku)}&brand=${encodeURIComponent(productData.brand)}&departmentId=${depId}${
						excludeId ? `&excludeId=${excludeId}` : ""
					}`
				);

				if (duplicateRes.ok) {
					const result = await duplicateRes.json();
					if (result.exists) {
						setDuplicateProduct(result.product);
						setPendingProductData({
							...productData,
							id: product.id, // ← сохраняем текущий id "new-..."
							isEditing: true,
							filters: [],
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
							categoryTitle: categories.find((c) => c.id === productData.categoryId)?.title || "—",
							department:
								user?.role === "superadmin"
									? departments.find((d) => d.id === productData.departmentId!) || undefined
									: user?.department?.id
									? departments.find((d) => d.id === user.department?.id!) || undefined
									: undefined,
						});
						setIsSaving(false);
						return false;
					}
				}
			} catch (err) {
				console.warn("Ошибка при проверке дубликата:", err);
			}
		}

		try {
			const res = await fetch(isNew ? `/api/products` : `/api/products/${product.id}`, {
				method: isNew ? "POST" : "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(productData),
			});

			if (res.status === 409) {
				showErrorToast("Такой товар уже существует. Измените артикул, бренд или отдел.");
				setIsSaving(false);
				return false;
			}

			if (res.ok) {
				const json = await res.json();
				const savedProduct = isNew ? json.product : { ...json.product, id: product.id };
				onUpdate(toEditableProduct(savedProduct));
				showSuccessToast("Товар сохранён");
				return true;
			} else {
				if (res.status === 400) {
					const err = await res.json();
					if (err?.error?.includes("Отдел")) {
						setErrors((prev) => ({ ...prev, departmentId: "Выберите отдел" }));
						showErrorToast("Заполните обязательные поля");
					} else {
						showErrorToast(err.error || "Ошибка при сохранении товара");
					}
				} else {
					showErrorToast("Ошибка при сохранении товара");
				}
				return false;
			}
		} catch (err) {
			showErrorToast("Ошибка сети");
			return false;
		} finally {
			setIsSaving(false);
		}
	};

	return {
		form,
		setForm,
		errors,
		setErrors,
		imageFile,
		setImageFile,
		imagePreview,
		setImagePreview,
		isSaving,
		handleSave,
	};
}
