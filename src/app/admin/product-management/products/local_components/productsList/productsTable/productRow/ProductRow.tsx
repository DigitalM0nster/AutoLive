// src\app\admin\product-management\products\local_components\productsList\productsTable\productRow\ProductRow.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { EditableProduct, NewProduct } from "@/lib/types";
import { useProductsStore } from "@/store/productsStore";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import ImageCell from "./ImageCell";
import { Camera, Check, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type ProductRowProps =
	| {
			isNew: true;
			product: NewProduct;
			onSaveNew: (p: NewProduct) => Promise<void>;
			onCancelNew: () => void;
			openConfirmPopup?: never;
			className?: string;
	  }
	| {
			isNew?: false;
			product: EditableProduct;
			openConfirmPopup: (id: number) => void;
			onSaveNew?: never;
			onCancelNew?: never;
			className?: string;
	  };

export default function ProductRow({ product, className = "", isNew = false, openConfirmPopup, onSaveNew, onCancelNew }: ProductRowProps) {
	// ========== STORES ==========
	const { updateProduct, setDuplicateInfo, selectedProductIds, toggleProductSelection, departments, categories } = useProductsStore();

	const { role, user } = useAuthStore();
	const userDepartmentId = user?.department?.id;

	const isManager = role === "manager";
	const isSuperadmin = role === "superadmin";

	// ========== ЛОКАЛЬНЫЕ СОСТОЯНИЯ ==========
	const [isEditing, setIsEditing] = useState(isNew);
	const [formData, setFormData] = useState<any>(() => ({ ...product }));
	const [errors, setErrors] = useState<Partial<Record<keyof NewProduct, string>>>({});
	const [isSaving, setIsSaving] = useState(false);

	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(product.image);

	const isSelected = !isNew && "id" in product && selectedProductIds.includes(product.id);

	// ========== ЭФФЕКТ: предпросмотр загружаемого изображения ==========
	useEffect(() => {
		if (!imageFile) return;
		const url = URL.createObjectURL(imageFile);
		setImagePreview(url);
		return () => URL.revokeObjectURL(url);
	}, [imageFile]);

	// ========== ЭФФЕКТ: сброс preview при отмене/отсутствии нового файла ==========
	useEffect(() => {
		if (imageFile) return;
		setImagePreview(product.image);
	}, [product.image, imageFile]);

	// ========== ЭФФЕКТ: автоустановка отдела для админа ==========
	useEffect(() => {
		if (!isSuperadmin && isNew && !formData.departmentId && userDepartmentId) {
			setFormData((p: any) => ({ ...p, departmentId: userDepartmentId }));
		}
	}, [isSuperadmin, isNew, formData.departmentId, userDepartmentId]);

	// ========== ОБРАБОТЧИКИ ИЗМЕНЕНИЙ ==========
	const handleText = (field: keyof NewProduct) => (e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev: any) => ({ ...prev, [field]: e.target.value }));

	const handleTextArea = (field: keyof NewProduct) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((prev: any) => ({ ...prev, [field]: e.target.value }));

	const handleNumber = (field: keyof NewProduct) => (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setFormData((prev: any) => ({ ...prev, [field]: val === "" ? null : parseFloat(val) }));
	};

	const removeImage = () => {
		setImageFile(null);
		setImagePreview(null);
		setFormData((prev: any) => ({ ...prev, image: null }));
	};

	// ========== ВАЛИДАЦИЯ ==========
	const validate = () => {
		const newErrors: typeof errors = {};
		if (!formData.departmentId) newErrors.departmentId = "Обязательное поле";
		if (!formData.brand?.trim()) newErrors.brand = "Обязательное поле";
		if (!formData.sku?.trim()) newErrors.sku = "Обязательное поле";
		if (!formData.title?.trim()) newErrors.title = "Обязательное поле";
		if (formData.price == null || isNaN(formData.price)) newErrors.price = "Обязательное поле";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// ========== СОХРАНЕНИЕ ==========
	const save = async () => {
		if (!validate()) {
			showErrorToast("Заполните обязательные поля");
			return;
		}

		setIsSaving(true);

		try {
			// 1. Загрузка изображения (если выбрано новое)
			if (imageFile) {
				const fd = new FormData();
				fd.append("image", imageFile);
				const res = await fetch("/api/upload", { method: "POST", body: fd });
				if (!res.ok) throw new Error("Ошибка загрузки изображения");
				const { url } = await res.json();
				formData.image = url;
			}

			// 2. Проверка дубликата
			const excludeId = !isNew && "id" in product ? `&excludeId=${product.id}` : "";
			const res = await fetch(
				`/api/products/check-duplicate?sku=${encodeURIComponent(formData.sku)}&brand=${encodeURIComponent(formData.brand)}&departmentId=${
					formData.departmentId ?? "null"
				}${excludeId}`
			);
			if (!res.ok) throw new Error("Ошибка проверки дубликата");
			const data = await res.json();

			if (data.exists) {
				setDuplicateInfo({
					existing: data.product,
					pending: { ...(formData as EditableProduct) },
				});
				return;
			}

			// 3. Сохранение
			if (isNew && onSaveNew) {
				await onSaveNew(formData as NewProduct);
			} else {
				const updated = await updateProduct(formData as EditableProduct);
				setFormData(updated); // ⬅⛳️ ОБНОВЛЯЕМ ДАННЫЕ В СТРОКЕ
			}

			showSuccessToast("Сохранено");
			setIsEditing(false);
			if (isNew && onCancelNew) onCancelNew();
		} catch {
			showErrorToast("Ошибка сохранения");
		} finally {
			setIsSaving(false);
		}
	};

	// ========== ОТМЕНА ==========
	const cancel = () => {
		if (isNew && onCancelNew) {
			onCancelNew();
			return;
		}
		setFormData({ ...product });
		setImageFile(null);
		setIsEditing(false);
	};

	// РЕЖИМ РЕДАКТИРОВАНИЯ
	if (isEditing) {
		return (
			<>
				<tr className={`${className} bg-blue-50`}>
					<td
						className="px-4 py-2 text-center cursor-pointer"
						onClick={() => {
							if (!isNew && "id" in product) toggleProductSelection(product.id);
						}}
					>
						{!isNew && "id" in product && (
							<input type="checkbox" checked={isSelected} onChange={(e) => e.stopPropagation()} className="form-checkbox h-4 w-4 text-gray-500 cursor-pointer" />
						)}
					</td>

					{isSuperadmin && (
						<td className="px-4 py-2">
							<select
								value={String(formData.departmentId ?? "")}
								onChange={(e) => setFormData((p: any) => ({ ...p, departmentId: +e.target.value }))}
								className={`w-full border rounded px-2 py-1 text-sm ${errors.departmentId ? "border-red-500" : ""}`}
							>
								{departments.map((d) => (
									<option key={d.id} value={d.id}>
										{d.name}
									</option>
								))}
							</select>
							{errors.departmentId && <div className="text-xs text-red-500 mt-1">{errors.departmentId}</div>}
						</td>
					)}
					{(["brand", "sku", "title"] as (keyof NewProduct)[]).map((f) => (
						<td key={f} className="px-4 py-2">
							<input
								className={`w-full border rounded px-2 py-1 text-sm ${errors[f] ? "border-red-500" : ""}`}
								value={String(formData[f] ?? "")}
								onChange={handleText(f)}
							/>
							{errors[f] && <div className="text-xs text-red-500 mt-1">{errors[f]}</div>}
						</td>
					))}
					<td className="px-4 py-2">
						<textarea rows={2} className="w-full border rounded px-2 py-1 text-sm" value={formData.description ?? ""} onChange={handleTextArea("description")} />
					</td>
					{(["supplierPrice", "price"] as (keyof NewProduct)[]).map((f) => (
						<td key={f} className="px-4 py-2">
							<input
								type="number"
								className={`w-full border rounded px-2 py-1 text-sm ${errors[f] ? "border-red-500" : ""}`}
								value={formData[f] != null ? String(formData[f]) : ""}
								onChange={handleNumber(f)}
							/>
							{errors[f] && <div className="text-xs text-red-500 mt-1">{errors[f]}</div>}
						</td>
					))}
					<td className="px-4 py-2">
						<select
							value={String(formData.categoryId ?? "")}
							onChange={(e) =>
								setFormData((p: any) => ({
									...p,
									categoryId: e.target.value === "" ? null : parseInt(e.target.value),
								}))
							}
							className="w-full border rounded px-2 py-1 text-sm"
						>
							<option value="">—</option>
							{categories
								.filter((c) => c.allowedDepartments?.some((d) => d.departmentId === formData.departmentId))
								.map((c) => (
									<option key={c.id} value={c.id}>
										{c.title}
									</option>
								))}
						</select>
					</td>
					<td className="px-4 py-2 text-center">
						<ImageCell
							image={imagePreview}
							imageFile={imageFile}
							setImageFile={setImageFile}
							setImagePreview={setImagePreview}
							onRemove={removeImage}
							productId={"id" in product ? product.id : "new"}
						/>
					</td>
					{!isManager && (
						<>
							<td className="px-4 py-2 space-y-1 text-center">
								<button
									onClick={save}
									disabled={isSaving}
									className={`inline-flex items-center justify-center w-full px-2 py-1 rounded ${
										isSaving ? "bg-gray-400 cursor-wait" : "bg-green-600 hover:bg-green-700 text-white"
									}`}
								>
									{isSaving ? (
										<span className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />
									) : (
										<Check className="w-4 h-4 mr-1" />
									)}
									Сохранить
								</button>
								<button onClick={cancel} className="inline-flex items-center justify-center w-full px-2 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">
									<X className="w-4 h-4 mr-1" /> Отмена
								</button>
							</td>
						</>
					)}
				</tr>
			</>
		);
	}

	// РЕЖИМ ПРОСМОТРА
	return (
		<>
			<tr className={`${className} group hover:bg-gray-50`}>
				<td
					className="px-4 py-2 text-center cursor-pointer"
					onClick={() => {
						if (!isNew && "id" in product) toggleProductSelection(product.id);
					}}
				>
					<input type="checkbox" checked={isSelected} onChange={(e) => e.stopPropagation()} className="form-checkbox h-4 w-4 text-gray-500 cursor-pointer" />
				</td>

				{isSuperadmin && <td className="px-4 py-2 whitespace-nowrap text-gray-700 text-xs">{product.department?.name}</td>}
				<td className="px-4 py-2 whitespace-nowrap text-gray-700 text-xs">{product.brand}</td>
				<td className="px-4 py-2 whitespace-nowrap text-gray-700 text-xs">{product.sku}</td>
				<td className="px-4 py-2 text-gray-700 truncate max-w-[80px] text-xs">{product.title}</td>
				<td className="px-4 py-2 text-gray-500 truncate max-w-[80px] text-xs">{product.description || "—"}</td>
				<td className="px-4 py-2 whitespace-nowrap text-gray-700 text-xs">{product.supplierPrice != null ? `${product.supplierPrice} ₽` : "—"}</td>
				<td className="px-4 py-2 whitespace-nowrap text-gray-700 text-xs">{`${product.price} ₽`}</td>
				<td className="px-4 py-2 whitespace-nowrap text-gray-700 text-xs">{formData.categoryTitle || "—"}</td>
				<td className="px-4 py-2 text-center">
					{product.image ? <img src={product.image} className="mx-auto w-10 h-10 object-cover rounded" alt="" /> : <Camera className="mx-auto w-6 h-6 text-gray-300" />}
				</td>
				{!isManager && (
					<>
						<td className="px-4 py-2 space-x-2 text-center">
							<button onClick={() => setIsEditing(true)} className="text-blue-600 hover:text-blue-800">
								Редактировать
							</button>
							{!isNew && openConfirmPopup && (
								<button onClick={() => openConfirmPopup(product.id)} className="text-red-600 hover:text-red-800">
									Удалить
								</button>
							)}
						</td>
					</>
				)}
			</tr>
		</>
	);
}
