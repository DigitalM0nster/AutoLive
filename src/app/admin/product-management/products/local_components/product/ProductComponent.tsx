"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
// Используем стандартные классы из globals.scss
import { Product, Category, Department } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import Skeleton from "./Skeleton";

type ProductPageProps = {
	productId?: string | number; // Если не указан, значит создаем новый товар
	isCreating?: boolean;
};

export default function ProductComponent({ productId, isCreating = false }: ProductPageProps) {
	const { user } = useAuthStore();
	const router = useRouter();
	const [productData, setProductData] = useState<Product | null>(null);
	const [loading, setLoading] = useState(!isCreating); // Не показываем загрузку при создании
	const [error, setError] = useState<string | null>(null);
	const [categories, setCategories] = useState<Category[]>([]);
	const [departments, setDepartments] = useState<Department[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false); // Состояние для отслеживания изменений
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Состояние для подтверждения удаления
	const [isDeleting, setIsDeleting] = useState(false); // Состояние для процесса удаления
	const [initialFormData, setInitialFormData] = useState({
		// Сохраняем начальные данные формы для сравнения
		title: "",
		sku: "",
		brand: "",
		price: "",
		supplierPrice: "",
		description: "",
		image: "",
		categoryId: "",
		departmentId: "",
	});

	// Состояние для формы редактирования/создания
	const [formData, setFormData] = useState({
		title: "",
		sku: "",
		brand: "",
		price: "",
		supplierPrice: "",
		description: "",
		image: "",
		categoryId: "",
		departmentId: "",
	});

	// Проверка прав доступа при создании
	useEffect(() => {
		if (isCreating && user?.role !== "superadmin" && user?.role !== "admin") {
			showErrorToast("У вас нет прав для создания товаров");
			router.push("/admin/product-management/products");
		}
	}, [isCreating, user, router]);

	// Загрузка данных товара
	useEffect(() => {
		const fetchProductData = async () => {
			if (isCreating) return; // Не загружаем данные если создаем новый товар

			try {
				setLoading(true);
				const response = await fetch(`/api/products/${productId}`, {
					method: "GET",
					credentials: "include",
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Ошибка при загрузке данных товара");
				}

				const data = await response.json();
				setProductData(data);
				setFormData({
					title: data.title || "",
					sku: data.sku || "",
					brand: data.brand || "",
					price: data.price?.toString() || "",
					supplierPrice: data.supplierPrice?.toString() || "",
					description: data.description || "",
					image: data.image || "",
					categoryId: data.category?.id?.toString() || "",
					departmentId: data.department?.id?.toString() || "",
				});
				setInitialFormData({
					// Сохраняем начальные данные при загрузке
					title: data.title || "",
					sku: data.sku || "",
					brand: data.brand || "",
					price: data.price?.toString() || "",
					supplierPrice: data.supplierPrice?.toString() || "",
					description: data.description || "",
					image: data.image || "",
					categoryId: data.category?.id?.toString() || "",
					departmentId: data.department?.id?.toString() || "",
				});
			} catch (err) {
				console.error("Ошибка при загрузке данных товара:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			} finally {
				setLoading(false);
			}
		};

		fetchProductData();
	}, [productId, isCreating]);

	// Загрузка категорий и отделов
	useEffect(() => {
		const fetchCategoriesAndDepartments = async () => {
			try {
				// Загружаем категории
				const categoriesResponse = await fetch("/api/categories", {
					credentials: "include",
				});
				if (categoriesResponse.ok) {
					const categoriesData = await categoriesResponse.json();
					setCategories(categoriesData);
				}

				// Загружаем отделы
				const departmentsResponse = await fetch("/api/departments", {
					credentials: "include",
				});
				if (departmentsResponse.ok) {
					const departmentsData = await departmentsResponse.json();
					setDepartments(departmentsData);
				}
			} catch (err) {
				console.error("Ошибка при загрузке категорий и отделов:", err);
			}
		};

		fetchCategoriesAndDepartments();
	}, []);

	// Отслеживание изменений в форме
	useEffect(() => {
		const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
		setHasChanges(hasFormChanges);
	}, [formData, initialFormData]);

	// Обработчик изменения полей формы
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	// Обработчик сохранения
	const handleSave = async () => {
		try {
			setIsSaving(true);

			// Валидация
			if (!formData.title.trim()) {
				showErrorToast("Название товара обязательно");
				return;
			}
			if (!formData.sku.trim()) {
				showErrorToast("SKU товара обязательно");
				return;
			}
			if (!formData.brand.trim()) {
				showErrorToast("Бренд товара обязателен");
				return;
			}
			if (!formData.price || isNaN(Number(formData.price))) {
				showErrorToast("Цена должна быть числом");
				return;
			}
			if (!formData.supplierPrice || isNaN(Number(formData.supplierPrice))) {
				showErrorToast("Цена поставщика должна быть числом");
				return;
			}

			const requestData = {
				title: formData.title.trim(),
				sku: formData.sku.trim(),
				brand: formData.brand.trim(),
				price: Number(formData.price),
				supplierPrice: Number(formData.supplierPrice),
				description: formData.description.trim(),
				image: formData.image.trim(),
				categoryId: formData.categoryId ? Number(formData.categoryId) : null,
				departmentId: formData.departmentId ? Number(formData.departmentId) : null,
			};

			let response;
			if (isCreating) {
				// Создание нового товара
				response = await fetch("/api/products", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify(requestData),
				});
			} else {
				// Обновление существующего товара
				response = await fetch(`/api/products/${productId}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify(requestData),
				});
			}

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка при сохранении товара");
			}

			const data = await response.json();
			showSuccessToast(isCreating ? "Товар успешно создан" : "Товар успешно обновлен");

			if (isCreating) {
				// Перенаправляем на страницу созданного товара
				router.push(`/admin/product-management/products/${data.id}`);
			} else {
				// Обновляем данные товара
				setProductData(data);
				setInitialFormData(formData); // Обновляем начальные данные
				setHasChanges(false);
			}
		} catch (err) {
			console.error("Ошибка при сохранении товара:", err);
			showErrorToast(err instanceof Error ? err.message : "Неизвестная ошибка");
		} finally {
			setIsSaving(false);
		}
	};

	// Обработчик удаления
	const handleDelete = async () => {
		try {
			setIsDeleting(true);
			const response = await fetch(`/api/products/${productId}`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка при удалении товара");
			}

			showSuccessToast("Товар успешно удален");
			router.push("/admin/product-management/products");
		} catch (err) {
			console.error("Ошибка при удалении товара:", err);
			showErrorToast(err instanceof Error ? err.message : "Неизвестная ошибка");
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	// Проверяем права на редактирование
	const canEdit = user?.role === "superadmin" || user?.role === "admin";

	if (loading) {
		return <Skeleton />;
	}

	if (error) {
		return (
			<div className={`tableContent`}>
				<div className={`errorMessage`}>
					<h3>Ошибка загрузки</h3>
					<p>{error}</p>
					<Link href="/admin/product-management/products" className={`backLink`}>
						← Вернуться к списку товаров
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className={`tableContent`}>
			<div className={`formContainer`}>
				<div className={`formHeader`}>
					<h2>{isCreating ? "Создание товара" : `Товар: ${productData?.title || "Загрузка..."}`}</h2>
					{!isCreating && canEdit && (
						<div className={`formActions`}>
							<button onClick={handleSave} disabled={!hasChanges || isSaving} className={`primaryButton ${hasChanges ? "hasChanges" : ""}`}>
								{isSaving ? "Сохранение..." : "Сохранить изменения"}
							</button>
							{user?.role === "superadmin" && (
								<button onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting} className={`dangerButton`}>
									{isDeleting ? "Удаление..." : "Удалить товар"}
								</button>
							)}
						</div>
					)}
				</div>

				<div className={`formFields`}>
					<div className={`formRow`}>
						<div className={`formField`}>
							<label htmlFor="title">Название товара *</label>
							<input
								type="text"
								id="title"
								name="title"
								value={formData.title}
								onChange={handleInputChange}
								disabled={!canEdit}
								placeholder="Введите название товара"
							/>
						</div>
						<div className={`formField`}>
							<label htmlFor="sku">SKU *</label>
							<input type="text" id="sku" name="sku" value={formData.sku} onChange={handleInputChange} disabled={!canEdit} placeholder="Введите SKU" />
						</div>
					</div>

					<div className={`formRow`}>
						<div className={`formField`}>
							<label htmlFor="brand">Бренд *</label>
							<input type="text" id="brand" name="brand" value={formData.brand} onChange={handleInputChange} disabled={!canEdit} placeholder="Введите бренд" />
						</div>
						<div className={`formField`}>
							<label htmlFor="price">Цена *</label>
							<input
								type="number"
								id="price"
								name="price"
								value={formData.price}
								onChange={handleInputChange}
								disabled={!canEdit}
								placeholder="Введите цену"
								step="0.01"
								min="0"
							/>
						</div>
					</div>

					<div className={`formRow`}>
						<div className={`formField`}>
							<label htmlFor="supplierPrice">Цена поставщика *</label>
							<input
								type="number"
								id="supplierPrice"
								name="supplierPrice"
								value={formData.supplierPrice}
								onChange={handleInputChange}
								disabled={!canEdit}
								placeholder="Введите цену поставщика"
								step="0.01"
								min="0"
							/>
						</div>
						<div className={`formField`}>
							<label htmlFor="image">Изображение</label>
							<input type="url" id="image" name="image" value={formData.image} onChange={handleInputChange} disabled={!canEdit} placeholder="URL изображения" />
						</div>
					</div>

					<div className={`formRow`}>
						<div className={`formField`}>
							<label htmlFor="categoryId">Категория</label>
							<select id="categoryId" name="categoryId" value={formData.categoryId} onChange={handleInputChange} disabled={!canEdit}>
								<option value="">Выберите категорию</option>
								{categories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.title}
									</option>
								))}
							</select>
						</div>
						<div className={`formField`}>
							<label htmlFor="departmentId">Отдел</label>
							<select id="departmentId" name="departmentId" value={formData.departmentId} onChange={handleInputChange} disabled={!canEdit}>
								<option value="">Выберите отдел</option>
								{departments.map((department) => (
									<option key={department.id} value={department.id}>
										{department.name}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className={`formField`}>
						<label htmlFor="description">Описание</label>
						<textarea
							id="description"
							name="description"
							value={formData.description}
							onChange={handleInputChange}
							disabled={!canEdit}
							placeholder="Введите описание товара"
							rows={4}
						/>
					</div>
				</div>

				{!canEdit && (
					<div className={`noEditMessage`}>
						<p>У вас нет прав для редактирования товаров. Обратитесь к администратору.</p>
					</div>
				)}
			</div>

			{showDeleteConfirm && (
				<ConfirmPopup
					open={showDeleteConfirm}
					title="Подтверждение удаления"
					message={`Вы уверены, что хотите удалить товар "${productData?.title}"? Это действие нельзя отменить.`}
					onConfirm={handleDelete}
					onCancel={() => setShowDeleteConfirm(false)}
					confirmText="Удалить"
					cancelText="Отмена"
				/>
			)}
		</div>
	);
}
