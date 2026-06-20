"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
// Используем стандартные классы из globals.scss
import { Product, Category, Department, CategoryFilterForSelection, SelectedFilterValue } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import ImageUpload from "@/components/ui/imageUpload/ImageUpload";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import Skeleton from "./Skeleton";

type ProductPageProps = {
	productId?: string | number; // Если не указан, значит создаем новый товар
	isCreating?: boolean;
	userRole?: string; // Роль пользователя для определения режима отображения
};

export default function ProductComponent({ productId, isCreating = false, userRole }: ProductPageProps) {
	const { user } = useAuthStore();
	const router = useRouter();
	const [productData, setProductData] = useState<Product | null>(null);
	const [loading, setLoading] = useState(!isCreating); // Не показываем загрузку при создании
	const [error, setError] = useState<string | null>(null);
	const [categories, setCategories] = useState<Category[]>([]);
	const [allowedCategories, setAllowedCategories] = useState<Category[]>([]);
	const [departments, setDepartments] = useState<Department[]>([]);
	const [categoryFilters, setCategoryFilters] = useState<CategoryFilterForSelection[]>([]);
	const [selectedFilters, setSelectedFilters] = useState<SelectedFilterValue[]>([]);
	const [isLoadingFilters, setIsLoadingFilters] = useState(false);
	const [canChangeCategory, setCanChangeCategory] = useState(true);
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
		categoryId: "",
		departmentId: "",
	});
	const [initialSelectedFilters, setInitialSelectedFilters] = useState<SelectedFilterValue[]>([]);

	// Состояния для работы с изображением
	const [formImage, setFormImage] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string>("");
	const [originalImage, setOriginalImage] = useState<string>("");

	// Состояние для формы редактирования/создания
	const [formData, setFormData] = useState({
		title: "",
		sku: "",
		brand: "",
		price: "",
		supplierPrice: "",
		description: "",
		categoryId: "",
		departmentId: "",
	});

	// Определяем режим отображения на основе роли пользователя
	const isEditMode = userRole === "superadmin" || userRole === "admin";
	const isViewMode = userRole === "manager";

	// Проверка прав доступа при создании
	useEffect(() => {
		if (isCreating && !isEditMode) {
			showErrorToast("У вас нет прав для создания товаров");
			router.push("/admin/product-management/products");
		}
	}, [isCreating, isEditMode, router]);

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
				const product = data.product; // API возвращает { product: {...} }
				setProductData(product);

				// Устанавливаем разрешенные категории из API
				if (product.allowedCategories) {
					setAllowedCategories(product.allowedCategories);
				}
				if (product.canChangeCategory !== undefined) {
					setCanChangeCategory(product.canChangeCategory);
				}

				setFormData({
					title: product.title || "",
					sku: product.sku || "",
					brand: product.brand || "",
					price: product.price?.toString() || "",
					supplierPrice: product.supplierPrice?.toString() || "",
					description: product.description || "",
					categoryId: product.categoryId?.toString() || "",
					departmentId: product.department?.id?.toString() || "",
				});
				setInitialFormData({
					// Сохраняем начальные данные при загрузке
					title: product.title || "",
					sku: product.sku || "",
					brand: product.brand || "",
					price: product.price?.toString() || "",
					supplierPrice: product.supplierPrice?.toString() || "",
					description: product.description || "",
					categoryId: product.categoryId?.toString() || "",
					departmentId: product.department?.id?.toString() || "",
				});

				// Инициализируем изображение
				setImagePreview(product.image || "");
				setOriginalImage(product.image || "");

				// Инициализируем выбранные фильтры из существующих данных товара
				if (product.filters && product.filters.length > 0) {
					console.log("🔍 LOADING PRODUCT FILTERS:", product.filters);
					const existingFilters = product.filters.map((filter: any) => {
						if (filter.type === "range") {
							// Для диапазона используем rangeValue
							const rangeValue = filter.selected_values && filter.selected_values.length > 0 ? Number(filter.selected_values[0].value) : undefined;
							console.log("🔍 RANGE FILTER:", { id: filter.id, selected_values: filter.selected_values, rangeValue });
							return {
								filterId: filter.id,
								valueIds: [], // Для диапазона valueIds пустой
								rangeValue: rangeValue,
							};
						} else {
							// Для остальных типов используем valueIds
							return {
								filterId: filter.id,
								valueIds: filter.selected_values ? filter.selected_values.map((value: any) => value.id) : [],
							};
						}
					});
					console.log("🔍 CREATED FILTERS:", existingFilters);
					setSelectedFilters(existingFilters);
					setInitialSelectedFilters(existingFilters); // Сохраняем начальное состояние фильтров
				} else {
					console.log("🔍 NO PRODUCT FILTERS");
					setSelectedFilters([]);
					setInitialSelectedFilters([]);
				}

				// Загружаем фильтры категории для существующего товара
				if (product.categoryId) {
					fetchCategoryFiltersForProduct(product.categoryId);
				}
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
				// Загружаем категории (все для совместимости)
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

	// Загрузка разрешенных категорий при изменении отдела (для создания товара)
	useEffect(() => {
		const loadAllowedCategories = async () => {
			if (formData.departmentId && isCreating) {
				try {
					const response = await fetch(`/api/categories?departmentId=${formData.departmentId}`, {
						credentials: "include",
					});
					if (response.ok) {
						let categoriesData = await response.json();
						// Если для отдела нет привязанных категорий — показываем полный список (для суперадмина и настройки отдела)
						if (Array.isArray(categoriesData) && categoriesData.length === 0) {
							const allRes = await fetch("/api/categories", { credentials: "include" });
							if (allRes.ok) {
								categoriesData = await allRes.json();
							}
						}
						setAllowedCategories(categoriesData);
						setCanChangeCategory(categoriesData.length > 0);
					}
				} catch (err) {
					console.error("Ошибка при загрузке разрешенных категорий:", err);
				}
			}
		};

		loadAllowedCategories();
	}, [formData.departmentId, isCreating]);

	// Устанавливаем отдел пользователя при создании товара для не-суперадминов
	useEffect(() => {
		if (isCreating && user?.role !== "superadmin" && user?.departmentId) {
			setFormData((prev) => ({
				...prev,
				departmentId: user.departmentId!.toString(),
			}));
		}
	}, [isCreating, user?.role, user?.departmentId]);

	// Функция для загрузки фильтров категории
	const fetchCategoryFiltersForProduct = async (categoryId: number) => {
		setIsLoadingFilters(true);
		try {
			const response = await fetch(`/api/categories/${categoryId}/filters`, {
				credentials: "include",
			});

			if (response.ok) {
				const filters = await response.json();
				setCategoryFilters(filters);
			} else {
				console.error("Ошибка загрузки фильтров:", response.status, response.statusText);
				setCategoryFilters([]);
			}
		} catch (err) {
			console.error("Ошибка при загрузке фильтров категории:", err);
			setCategoryFilters([]);
		} finally {
			setIsLoadingFilters(false);
		}
	};

	// Загрузка фильтров категории при изменении категории
	useEffect(() => {
		const fetchCategoryFilters = async () => {
			if (!formData.categoryId) {
				setCategoryFilters([]);
				setSelectedFilters([]);
				return;
			}

			await fetchCategoryFiltersForProduct(Number(formData.categoryId));

			// Инициализируем выбранные фильтры только если это создание нового товара
			if (isCreating) {
				console.log("🔍 CREATING NEW PRODUCT - INIT FILTERS");
				setSelectedFilters((prev) => {
					if (prev.length > 0) {
						console.log("🔍 ALREADY HAVE FILTERS:", prev);
						return prev;
					}
					// Если нет выбранных фильтров, инициализируем пустыми
					const emptyFilters = categoryFilters.map((filter: CategoryFilterForSelection) => ({
						filterId: filter.id,
						valueIds: [],
						...(filter.type === "range" && { rangeValue: undefined }),
					}));
					console.log("🔍 CREATED EMPTY FILTERS:", emptyFilters);
					return emptyFilters;
				});
			} else {
				console.log("🔍 EDITING EXISTING PRODUCT - NOT INIT FILTERS");
			}
		};

		fetchCategoryFilters();
	}, [formData.categoryId, isCreating]);

	// Отслеживание изменений в форме, фильтрах и изображении
	useEffect(() => {
		const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
		const hasFilterChanges = JSON.stringify(selectedFilters) !== JSON.stringify(initialSelectedFilters);
		const hasImageChanges = formImage !== null;
		setHasChanges(hasFormChanges || hasFilterChanges || hasImageChanges);
	}, [formData, initialFormData, selectedFilters, initialSelectedFilters, formImage]);

	// Обработчик изменения полей формы
	const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value } = e.target;

		// Проверяем права на изменение отдела
		if (name === "departmentId" && user?.role !== "superadmin") {
			showErrorToast("Только суперадмин может изменять отдел товара");
			return;
		}

		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));

		// Если изменился отдел, загружаем разрешенные категории для этого отдела
		if (name === "departmentId" && value) {
			try {
				const response = await fetch(`/api/categories?departmentId=${value}`, {
					credentials: "include",
				});
				if (response.ok) {
					const categoriesData = await response.json();
					setAllowedCategories(categoriesData);
					setCanChangeCategory(categoriesData.length > 0);

					// Сбрасываем категорию, если она не разрешена для нового отдела
					const currentCategoryId = formData.categoryId;
					if (currentCategoryId && !categoriesData.some((cat: Category) => cat.id.toString() === currentCategoryId)) {
						setFormData((prev) => ({
							...prev,
							categoryId: "",
						}));
						// Очищаем фильтры при смене категории
						setCategoryFilters([]);
						setSelectedFilters([]);
					}
				}
			} catch (err) {
				console.error("Ошибка при загрузке разрешенных категорий:", err);
			}
		}

		// Если изменилась категория, загружаем фильтры для этой категории
		if (name === "categoryId") {
			if (value) {
				await fetchCategoryFiltersForProduct(Number(value));
			} else {
				// Если категория сброшена, очищаем фильтры
				setCategoryFilters([]);
				setSelectedFilters([]);
			}
		}
	};

	// Обработчик изменения фильтров (для select и multi_select)
	const handleFilterChange = (filterId: number, valueId: number) => {
		setSelectedFilters((prev) => {
			const existingFilterIndex = prev.findIndex((f) => f.filterId === filterId);
			const filter = categoryFilters.find((f) => f.id === filterId);

			if (existingFilterIndex !== -1) {
				const existingFilter = prev[existingFilterIndex];

				if (filter?.type === "select") {
					// Для единственного выбора - если нажимаем на уже выбранное значение, отключаем его
					if (existingFilter.valueIds.includes(valueId)) {
						const newFilters = [...prev];
						newFilters[existingFilterIndex] = {
							...existingFilter,
							valueIds: [],
						};
						return newFilters;
					} else {
						// Заменяем значение на новое
						const newFilters = [...prev];
						newFilters[existingFilterIndex] = {
							...existingFilter,
							valueIds: [valueId],
						};
						return newFilters;
					}
				} else {
					// Для множественного выбора - переключаем значение
					const newValueIds = existingFilter.valueIds.includes(valueId) ? existingFilter.valueIds.filter((id) => id !== valueId) : [...existingFilter.valueIds, valueId];
					const newFilters = [...prev];
					newFilters[existingFilterIndex] = {
						...existingFilter,
						valueIds: newValueIds,
					};
					return newFilters;
				}
			} else {
				// Создаем новый фильтр с выбранным значением
				return [...prev, { filterId, valueIds: [valueId] }];
			}
		});
	};

	// Обработчик для диапазонов (range)
	const handleRangeValueChange = (filterId: number, value: string) => {
		console.log("🔍 RANGE CHANGE:", { filterId, value });
		setSelectedFilters((prev) => {
			console.log("🔍 BEFORE:", prev);
			const existingFilterIndex = prev.findIndex((f) => f.filterId === filterId);
			const numericValue = value ? Number(value) : undefined;
			console.log("🔍 existingFilterIndex:", existingFilterIndex, "numericValue:", numericValue);

			if (existingFilterIndex !== -1) {
				// Обновляем существующий фильтр
				const newFilters = [...prev];
				newFilters[existingFilterIndex] = {
					...newFilters[existingFilterIndex],
					valueIds: [],
					rangeValue: numericValue,
				};
				console.log("🔍 UPDATED:", newFilters);
				return newFilters;
			} else if (numericValue !== undefined) {
				// Создаем новый фильтр с числовым значением
				const newFilter = {
					filterId,
					valueIds: [],
					rangeValue: numericValue,
				};
				const result = [...prev, newFilter];
				console.log("🔍 CREATED:", result);
				return result;
			}
			console.log("🔍 NO CHANGE");
			return prev;
		});
	};

	// Обработчик для булевых значений (boolean)
	const handleBooleanValueChange = (filterId: number, valueId: number) => {
		setSelectedFilters((prev) => {
			const existingFilterIndex = prev.findIndex((f) => f.filterId === filterId);

			if (existingFilterIndex !== -1) {
				const existingFilter = prev[existingFilterIndex];

				if (existingFilter.valueIds.includes(valueId)) {
					const newFilters = [...prev];
					newFilters[existingFilterIndex] = {
						...existingFilter,
						valueIds: [],
					};
					return newFilters;
				} else {
					const newFilters = [...prev];
					newFilters[existingFilterIndex] = {
						...existingFilter,
						valueIds: [valueId],
					};
					return newFilters;
				}
			} else {
				return [...prev, { filterId, valueIds: [valueId] }];
			}
		});
	};

	// Обработчик для булевых значений (boolean) - старый для совместимости
	const handleBooleanChange = (filterId: number, value: boolean) => {
		setSelectedFilters((prev) => {
			const existingFilterIndex = prev.findIndex((f) => f.filterId === filterId);
			const valueId = value ? 1 : 0;

			if (existingFilterIndex !== -1) {
				// Обновляем существующий фильтр
				const newFilters = [...prev];
				newFilters[existingFilterIndex] = {
					...newFilters[existingFilterIndex],
					valueIds: [valueId],
				};
				return newFilters;
			} else {
				// Создаем новый фильтр с булевым значением
				return [...prev, { filterId, valueIds: [valueId] }];
			}
		});
	};

	// Получение значения для диапазона
	const getRangeValue = (filterId: number) => {
		const filter = selectedFilters.find((f) => f.filterId === filterId);
		console.log("🔍 GET RANGE VALUE:", { filterId, filter, selectedFilters });
		if (filter && filter.rangeValue !== undefined && filter.rangeValue !== null) {
			console.log("🔍 RETURNING:", filter.rangeValue.toString());
			return filter.rangeValue.toString();
		}
		console.log("🔍 RETURNING EMPTY");
		return "";
	};

	// Обработчики для работы с изображением
	const handleImageChange = (file: File | null) => {
		setFormImage(file);
	};

	const handleImageRemove = () => {
		setFormImage(null);
		setImagePreview("");
	};

	// Обработчик отмены изменений
	const handleCancel = () => {
		if (productData) {
			// Восстанавливаем исходные данные
			setFormData({
				title: productData.title || "",
				sku: productData.sku || "",
				brand: productData.brand || "",
				price: productData.price?.toString() || "",
				supplierPrice: productData.supplierPrice?.toString() || "",
				description: productData.description || "",
				categoryId: productData.categoryId?.toString() || "",
				departmentId: productData.department?.id?.toString() || "",
			});

			// Восстанавливаем разрешенные категории и состояние изменения категории
			if (productData.allowedCategories) {
				setAllowedCategories(productData.allowedCategories);
			}
			if (productData.canChangeCategory !== undefined) {
				setCanChangeCategory(productData.canChangeCategory);
			}

			// Восстанавливаем выбранные фильтры
			if (productData.filters && productData.filters.length > 0) {
				const existingFilters = productData.filters.map((filter: any) => {
					if (filter.type === "range") {
						const rangeValue = filter.selected_values && filter.selected_values.length > 0 ? Number(filter.selected_values[0].value) : undefined;
						return {
							filterId: filter.id,
							valueIds: [],
							rangeValue: rangeValue,
						};
					} else {
						return {
							filterId: filter.id,
							valueIds: filter.selected_values ? filter.selected_values.map((value: any) => value.id) : [],
						};
					}
				});
				setSelectedFilters(existingFilters);
				setInitialSelectedFilters(existingFilters);
			} else {
				setSelectedFilters([]);
				setInitialSelectedFilters([]);
			}

			// Восстанавливаем изображение
			setFormImage(null);
			setImagePreview(originalImage);

			// Восстанавливаем фильтры категории
			if (productData.categoryId) {
				fetchCategoryFiltersForProduct(productData.categoryId);
			} else {
				setCategoryFilters([]);
			}

			// Сбрасываем состояние изменений
			setHasChanges(false);
		} else {
			// Если это создание нового товара, сбрасываем все
			setFormData({
				title: "",
				sku: "",
				brand: "",
				price: "",
				supplierPrice: "",
				description: "",
				categoryId: "",
				departmentId: "",
			});
			setSelectedFilters([]);
			setInitialSelectedFilters([]);
			setAllowedCategories([]);
			setCanChangeCategory(true);
			setCategoryFilters([]);
			setHasChanges(false);
		}
	};

	// Проверяем, выбрано ли значение фильтра
	const isFilterValueSelected = (filterId: number, valueId: number) => {
		const filter = selectedFilters.find((f) => f.filterId === filterId);
		return filter ? filter.valueIds.includes(valueId) : false;
	};

	// Обработчик сохранения
	const handleSave = async () => {
		try {
			setIsSaving(true);
			setInitialSelectedFilters(selectedFilters);

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

			// Валидация цены поставщика
			const supplierPrice = Number(formData.supplierPrice);
			const sitePrice = Number(formData.price);

			if (supplierPrice > sitePrice) {
				showErrorToast("Цена поставщика не может быть больше цены на сайте!");
				return;
			}

			// Создаем FormData для отправки файла
			const formDataToSend = new FormData();
			formDataToSend.append("title", formData.title.trim());
			formDataToSend.append("sku", formData.sku.trim());
			formDataToSend.append("brand", formData.brand.trim());
			formDataToSend.append("price", Number(formData.price).toString());
			formDataToSend.append("supplierPrice", Number(formData.supplierPrice).toString());
			formDataToSend.append("description", formData.description.trim());
			if (formData.categoryId) {
				formDataToSend.append("categoryId", Number(formData.categoryId).toString());
			}
			// Отправляем departmentId только если пользователь суперадмин
			if (user?.role === "superadmin" && formData.departmentId) {
				formDataToSend.append("departmentId", Number(formData.departmentId).toString());
			}
			console.log("🔍 SENDING FILTERS:", selectedFilters);
			formDataToSend.append("filterValues", JSON.stringify(selectedFilters));

			// Добавляем файл изображения если есть
			if (formImage) {
				formDataToSend.append("imageFile", formImage);
			}

			let response;
			if (isCreating) {
				// Создание нового товара
				response = await fetch("/api/products", {
					method: "POST",
					credentials: "include",
					body: formDataToSend,
				});
			} else {
				// Обновление существующего товара
				response = await fetch(`/api/products/${productId}`, {
					method: "PATCH",
					credentials: "include",
					body: formDataToSend,
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
				router.push(`/admin/product-management/products/${data.product.id}`);
			} else {
				// Обновляем productData с новыми данными из API
				if (data.product) {
					setProductData(data.product);
				}

				// Обновляем хлебные крошки
				try {
					await fetch("/api/breadcrumbs/revalidate", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							path: `/admin/product-management/products/${productId}`,
						}),
					});
				} catch (error) {
					console.error("Ошибка обновления хлебных крошек:", error);
				}

				// Обновляем начальные данные формы
				setInitialFormData(formData);
				setInitialSelectedFilters(selectedFilters);
				setHasChanges(false);

				// Сбрасываем изображение после успешного сохранения
				setFormImage(null);

				// Обновляем превью изображения если оно изменилось
				if (data.product?.image) {
					setImagePreview(data.product.image);
					setOriginalImage(data.product.image);
				}
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
	const canEdit = isEditMode;

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
		<div className={`tableContent productComponent`}>
			<div className={`formContainer`}>
				<div className={`formHeader`}>
					<h2>{isCreating ? "Создание товара" : isViewMode ? `Просмотр товара: ${productData?.title || "Загрузка..."}` : `${productData?.title || "Загрузка..."}`}</h2>
					{!isCreating && canEdit && user?.role === "superadmin" && (
						<div className={`formActions`}>
							<button onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting} className={`dangerButton`}>
								{isDeleting ? "Удаление..." : "Удалить товар"}
							</button>
						</div>
					)}
				</div>

				{canEdit && (
					<div className={`formFields`}>
						{/* Блок загрузки изображения */}
						<div className="formRow">
							<div className="formField">
								<ImageUpload imageUrl={imagePreview} onImageChange={handleImageChange} onImageRemove={handleImageRemove} disabled={!canEdit} />
							</div>
						</div>
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
						</div>

						<div className={`formRow`}>
							<div className={`formField`}>
								<label htmlFor="sku">SKU *</label>
								<input type="text" id="sku" name="sku" value={formData.sku} onChange={handleInputChange} disabled={!canEdit} placeholder="Введите SKU" />
							</div>
							<div className={`formField`}>
								<label htmlFor="brand">Бренд *</label>
								<input type="text" id="brand" name="brand" value={formData.brand} onChange={handleInputChange} disabled={!canEdit} placeholder="Введите бренд" />
							</div>
						</div>

						<div className="formRow">
							<div className={`formField`}>
								<label htmlFor="price">Цена на сайте*</label>
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
						</div>

						<div className={`formRow`}>
							<div className={`formField`}>
								<label htmlFor="departmentId">Отдел *</label>
								{user?.role === "superadmin" ? (
									<select id="departmentId" name="departmentId" value={formData.departmentId} onChange={handleInputChange} disabled={!canEdit}>
										<option value="">Выберите отдел</option>
										{departments.map((department) => (
											<option key={department.id} value={department.id}>
												{department.name}
											</option>
										))}
									</select>
								) : (
									<input
										type="text"
										value={isCreating ? user?.department?.name || "Не указан" : productData?.department?.name || "Не указан"}
										disabled={true}
										className={`disabledInput`}
										title="Только суперадмин может изменять отдел товара"
									/>
								)}
							</div>
							<div className={`formField`}>
								<label htmlFor="categoryId">Категория</label>
								<select id="categoryId" name="categoryId" value={formData.categoryId} onChange={handleInputChange} disabled={!canEdit || !canChangeCategory}>
									<option value="">Выберите категорию</option>
									{allowedCategories.map((category) => (
										<option key={category.id} value={category.id}>
											{category.title}
										</option>
									))}
								</select>
								{!canChangeCategory && <div className={`fieldNote`}>Для данного отдела не настроены разрешенные категории</div>}
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

						{/* Фильтры категории */}
						{isLoadingFilters && (
							<div className={`filtersSection`}>
								<Loading />
							</div>
						)}
						{categoryFilters.length > 0 && !isLoadingFilters && (
							<div className={`filtersSection`}>
								<h3 className={`filtersTitle`}>Фильтры категории</h3>
								<div className={`filtersContainer`}>
									{categoryFilters.map((filter) => (
										<div key={filter.id} className={`filterGroup`}>
											<label className={`filterLabel`}>
												{filter.title}
												{filter.type === "range" && filter.unit && ` (${filter.unit})`}
											</label>

											{/* Единственный выбор */}
											{filter.type === "select" && (
												<div className={`filterValues`}>
													{filter.values.map((value) => (
														<div
															key={value.id}
															className={`filterValueItem ${isFilterValueSelected(filter.id, value.id) ? "active" : ""} ${
																!canEdit ? "disabled" : ""
															}`}
															onClick={() => canEdit && handleFilterChange(filter.id, value.id)}
														>
															<span className={`filterValueText`}>{value.value}</span>
														</div>
													))}
												</div>
											)}

											{/* Множественный выбор */}
											{filter.type === "multi_select" && (
												<div className={`filterValues`}>
													{filter.values.map((value) => (
														<div
															key={value.id}
															className={`filterValueItem ${isFilterValueSelected(filter.id, value.id) ? "active" : ""} ${
																!canEdit ? "disabled" : ""
															}`}
															onClick={() => canEdit && handleFilterChange(filter.id, value.id)}
														>
															<span className={`filterValueText`}>{value.value}</span>
														</div>
													))}
												</div>
											)}

											{/* Диапазон */}
											{filter.type === "range" && (
												<div className={`filterRangeInput`}>
													<input
														type="number"
														placeholder="Введите значение"
														value={getRangeValue(filter.id)}
														onChange={(e) => handleRangeValueChange(filter.id, e.target.value)}
														disabled={!canEdit}
														className={`rangeInput ${!canEdit ? "disabled" : ""}`}
													/>
													{filter.unit && <span className={`rangeUnit`}>{filter.unit}</span>}
												</div>
											)}

											{/* Да/Нет */}
											{filter.type === "boolean" && (
												<div className={`filterBoolean`}>
													{filter.values.map((value, index) => (
														<div
															key={value.id}
															className={`booleanOption ${isFilterValueSelected(filter.id, value.id) ? "active" : ""} ${!canEdit ? "disabled" : ""}`}
															onClick={() => canEdit && handleBooleanValueChange(filter.id, value.id)}
														>
															<span>{value.value}</span>
														</div>
													))}
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						)}
						{categoryFilters.length === 0 && formData.categoryId && !isLoadingFilters && (
							<div className={`filtersSection`}>
								<p>Фильтры для выбранной категории не найдены</p>
							</div>
						)}
					</div>
				)}

				{!canEdit && isViewMode && (
					<div className={`viewModeContainer`}>
						<div className={`productInfoCard`}>
							<div className={`productImageSection`}>
								{productData?.image ? (
									<img src={productData.image} alt={productData.title} className={`productImage`} />
								) : (
									<div className={`noImagePlaceholder`}>
										<span>Нет изображения</span>
									</div>
								)}
							</div>
							<div className={`productDetailsSection`}>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Название:</span>
									<span className={`infoValue`}>{productData?.title}</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>SKU:</span>
									<span className={`infoValue`}>{productData?.sku}</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Бренд:</span>
									<span className={`infoValue`}>{productData?.brand}</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Цена:</span>
									<span className={`infoValue priceValue`}>{productData?.price} ₽</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Цена поставщика:</span>
									<span className={`infoValue`}>{productData?.supplierPrice ? `${productData.supplierPrice} ₽` : "Не указана"}</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Категория:</span>
									<span className={`infoValue`}>{productData?.categoryTitle || "Не указана"}</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Отдел:</span>
									<span className={`infoValue`}>{productData?.department?.name || "Не указан"}</span>
								</div>
								{productData?.description && (
									<div className={`productInfoRow fullWidth`}>
										<span className={`infoLabel`}>Описание:</span>
										<span className={`infoValue descriptionValue`}>{productData.description}</span>
									</div>
								)}
								{productData?.filters && productData.filters.length > 0 && (
									<div className={`productInfoRow fullWidth`}>
										<span className={`infoLabel`}>Фильтры:</span>
										<div className={`infoValue filtersValue`}>
											{productData.filters.map((filter: any) => (
												<div key={filter.id} className={`filterDisplayGroup`}>
													<span className={`filterDisplayLabel`}>{filter.title}:</span>
													<span className={`filterDisplayValues`}>
														{filter.selected_values ? filter.selected_values.map((value: any) => value.value).join(", ") : ""}
													</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{!canEdit && !isViewMode && (
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

			{/* Фиксированные кнопки для изменений */}
			{canEdit && hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={isSaving} saveText="Сохранить" />}
		</div>
	);
}
