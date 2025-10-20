"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import { Category, CategoryFilter, FilterType, FilterValue } from "@/lib/types";
import { Check, X, Trash2, Upload, Plus } from "lucide-react";
import styles from "./styles.module.scss";
import Link from "next/link";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import ImageUpload from "@/components/ui/imageUpload/ImageUpload";
import FilterCard from "./FilterCard";

interface CategoryPageClientProps {
	initialData?: {
		category: Category;
		filters?: CategoryFilter[];
	};
	isCreateMode?: boolean;
}

export default function CategoryPageClient({ initialData, isCreateMode = false }: CategoryPageClientProps) {
	const router = useRouter();
	const { user } = useAuthStore();

	// Если это режим создания, используем пустые значения
	const defaultCategory: Category = {
		id: 0,
		title: "",
		image: "",
		order: 0, // Добавляем недостающее поле order
	};

	const [category, setCategory] = useState<Category | null>(isCreateMode ? defaultCategory : initialData?.category || null);
	const [loading, setLoading] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showConfirmChangesModal, setShowConfirmChangesModal] = useState(false);

	const [formTitle, setFormTitle] = useState(isCreateMode ? "" : initialData?.category?.title || "");
	const [formImage, setFormImage] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string>(isCreateMode ? "" : initialData?.category?.image || "");
	const [isFormChanged, setIsFormChanged] = useState(false);

	const [originalTitle, setOriginalTitle] = useState(isCreateMode ? "" : initialData?.category?.title || "");
	const [originalImage, setOriginalImage] = useState(isCreateMode ? "" : initialData?.category?.image || "");

	// Новые состояния для управления фильтрами
	const initialFilters = isCreateMode ? [] : initialData?.filters || [];

	// Убираем дубликаты по ID (на случай если они есть)
	const uniqueFilters = initialFilters.filter((filter, index, self) => index === self.findIndex((f) => f.id === filter.id));

	const [filters, setFilters] = useState<CategoryFilter[]>(uniqueFilters);

	// Состояние для хранения значений фильтров
	// Для select, multi_select, range - общие значения
	// Для boolean - отдельные фиксированные значения
	const [filterTypeValues, setFilterTypeValues] = useState<Map<number, Map<FilterType, FilterValue[]>>>(new Map());

	// Состояния для ошибок валидации
	const [validationErrors, setValidationErrors] = useState<{
		categoryTitle?: string;
		filterTitles: { [filterId: number]: string };
		filterValues: { [filterId: number]: string };
		// Новое состояние для ошибок конкретных значений
		valueErrors: { [filterId: number]: { [valueId: number]: string } };
	}>({
		filterTitles: {},
		filterValues: {},
		valueErrors: {},
	});

	// Функция валидации всех полей
	const validateForm = () => {
		const errors: {
			categoryTitle?: string;
			filterTitles: { [filterId: number]: string };
			filterValues: { [filterId: number]: string };
			valueErrors: { [filterId: number]: { [valueId: number]: string } };
		} = {
			filterTitles: {},
			filterValues: {},
			valueErrors: {},
		};

		// Проверяем название категории
		if (!formTitle.trim()) {
			errors.categoryTitle = "Название категории обязательно для заполнения";
		}

		// Проверяем фильтры
		filters.forEach((filter) => {
			// Проверяем название фильтра
			if (!filter.title.trim()) {
				errors.filterTitles[filter.id] = "Название фильтра обязательно для заполнения";
			}

			// Проверяем значения фильтра (кроме boolean, у которого фиксированные значения)
			if (filter.type !== "boolean") {
				if (filter.values.length === 0) {
					errors.filterValues[filter.id] = "Необходимо добавить хотя бы одно значение";
				} else {
					// Проверяем каждое значение отдельно и добавляем ошибки для незаполненных
					filter.values.forEach((value) => {
						if (!value.value.trim()) {
							if (!errors.valueErrors[filter.id]) {
								errors.valueErrors[filter.id] = {};
							}
							errors.valueErrors[filter.id][value.id] = "Заполните значение";
						}
					});
				}
			}
		});

		setValidationErrors(errors);

		// Проверяем, что нет ошибок ни в одном поле
		const hasCategoryTitleError = !!errors.categoryTitle;
		const hasFilterTitleErrors = Object.keys(errors.filterTitles).length > 0;
		const hasFilterValueErrors = Object.keys(errors.filterValues).length > 0;
		const hasValueErrors = Object.keys(errors.valueErrors).length > 0;

		// Возвращаем false если есть любые ошибки
		return !hasCategoryTitleError && !hasFilterTitleErrors && !hasFilterValueErrors && !hasValueErrors;
	};

	// Функция для очистки ошибок конкретного поля
	const clearFieldError = (fieldType: "categoryTitle" | "filterTitle" | "filterValue" | "valueError", filterId?: number, valueId?: number) => {
		setValidationErrors((prev) => {
			const newErrors = { ...prev };

			if (fieldType === "categoryTitle") {
				delete newErrors.categoryTitle;
			} else if (fieldType === "filterTitle" && filterId !== undefined) {
				delete newErrors.filterTitles[filterId];
			} else if (fieldType === "filterValue" && filterId !== undefined) {
				delete newErrors.filterValues[filterId];
			} else if (fieldType === "valueError" && filterId !== undefined && valueId !== undefined) {
				if (newErrors.valueErrors[filterId]) {
					delete newErrors.valueErrors[filterId][valueId];
					// Если больше нет ошибок для этого фильтра, удаляем весь объект
					if (Object.keys(newErrors.valueErrors[filterId]).length === 0) {
						delete newErrors.valueErrors[filterId];
					}
				}
			}

			return newErrors;
		});
	};

	// Функции для управления фильтрами
	const addFilter = () => {
		const newFilterId = Date.now(); // Временный ID для новых фильтров

		const newFilter: CategoryFilter = {
			id: newFilterId,
			title: "", // Пустое название, которое пользователь сразу начнет редактировать
			type: "select", // По умолчанию тип "один выбор"
			values: [], // Пустой массив значений
		};

		// Инициализируем пустую карту значений для нового фильтра
		setFilterTypeValues((prev) => {
			const newMap = new Map(prev);
			newMap.set(newFilterId, new Map());
			return newMap;
		});

		setFilters((prev) => {
			const newFilters = [...prev, newFilter];
			return newFilters;
		});

		setIsFormChanged(true);
	};

	const updateFilter = (filterId: number, updatedFilter: Partial<CategoryFilter>) => {
		// Если обновляется название, проверяем на дубликаты
		if (updatedFilter.title !== undefined) {
			const existingFilter = filters.find((f) => f.id !== filterId && f.title === updatedFilter.title);
			if (existingFilter) {
				showErrorToast(`Фильтр с названием "${updatedFilter.title}" уже существует`);
				return;
			}

			// Очищаем ошибку названия при изменении
			if (updatedFilter.title.trim()) {
				clearFieldError("filterTitle", filterId);
			}
		}

		// Если изменяется тип фильтра
		if (updatedFilter.type !== undefined) {
			const currentFilter = filters.find((f) => f.id === filterId);
			if (currentFilter) {
				// Сохраняем текущие значения для текущего типа
				setFilterTypeValues((prev) => {
					const newMap = new Map(prev);
					if (!newMap.has(filterId)) {
						newMap.set(filterId, new Map());
					}
					const filterMap = newMap.get(filterId)!;
					filterMap.set(currentFilter.type, [...currentFilter.values]);
					return newMap;
				});

				// Если переключаемся на boolean, используем фиксированные значения
				if (updatedFilter.type === "boolean") {
					const booleanValues: FilterValue[] = [
						{ id: Date.now(), value: "Да" },
						{ id: Date.now() + 1, value: "Нет" },
					];
					updatedFilter.values = booleanValues;
				} else {
					// Если переключаемся на select, multi_select или range,
					// ищем общие значения (не boolean)
					let commonValues: FilterValue[] = [];

					// Проверяем все не-boolean типы на наличие значений
					const nonBooleanTypes: FilterType[] = ["select", "multi_select", "range"];
					for (const type of nonBooleanTypes) {
						const savedValues = filterTypeValues.get(filterId)?.get(type);
						if (savedValues && savedValues.length > 0) {
							commonValues = savedValues;
							break;
						}
					}

					// Если есть общие значения, используем их
					if (commonValues.length > 0) {
						updatedFilter.values = commonValues;
					} else {
						// Если нет общих значений, оставляем пустой массив
						updatedFilter.values = [];
					}
				}
			}
		}

		// Обновляем фильтр
		setFilters((prev) => {
			const newFilters = prev.map((f) => (f.id === filterId ? { ...f, ...updatedFilter } : f));

			// После обновления фильтра, сохраняем его значения
			const updatedFilterComplete = newFilters.find((f) => f.id === filterId);
			if (updatedFilterComplete) {
				setFilterTypeValues((prev) => {
					const newMap = new Map(prev);
					if (!newMap.has(filterId)) {
						newMap.set(filterId, new Map());
					}
					const filterMap = newMap.get(filterId)!;

					// Если это не boolean тип, сохраняем значения в общий пул для select/multi_select/range
					if (updatedFilterComplete.type !== "boolean") {
						// Сохраняем в текущий тип
						filterMap.set(updatedFilterComplete.type, [...updatedFilterComplete.values]);
					} else {
						// Для boolean сохраняем только в boolean
						filterMap.set("boolean", [...updatedFilterComplete.values]);
					}

					return newMap;
				});
			}

			return newFilters;
		});

		setIsFormChanged(true);
	};

	const deleteFilter = (filterId: number) => {
		// Удаляем фильтр из списка
		setFilters((prev) => prev.filter((f) => f.id !== filterId));

		// Очищаем сохраненные значения для этого фильтра
		setFilterTypeValues((prev) => {
			const newMap = new Map(prev);
			newMap.delete(filterId);
			return newMap;
		});

		setIsFormChanged(true);
	};

	const addFilterValue = (filterId: number, value: Omit<FilterValue, "id">) => {
		setFilters((prev) => {
			const newFilters = prev.map((f) => (f.id === filterId ? { ...f, values: [...f.values, { ...value, id: Date.now() } as FilterValue] } : f));

			// Сохраняем новые значения для текущего типа фильтра
			const updatedFilter = newFilters.find((f) => f.id === filterId);
			if (updatedFilter) {
				setFilterTypeValues((prev) => {
					const newMap = new Map(prev);
					if (!newMap.has(filterId)) {
						newMap.set(filterId, new Map());
					}
					const filterMap = newMap.get(filterId)!;

					// Если это не boolean тип, сохраняем значения в общий пул для select/multi_select/range
					if (updatedFilter.type !== "boolean") {
						// Сохраняем в текущий тип
						filterMap.set(updatedFilter.type, [...updatedFilter.values]);
					} else {
						// Для boolean сохраняем только в boolean
						filterMap.set("boolean", [...updatedFilter.values]);
					}

					return newMap;
				});
			}

			return newFilters;
		});

		// Очищаем ошибку значений при добавлении
		clearFieldError("filterValue", filterId);

		setIsFormChanged(true);
	};

	const updateFilterValue = (filterId: number, valueId: number, updatedValue: Omit<FilterValue, "id">) => {
		setFilters((prev) => {
			const newFilters = prev.map((f) =>
				f.id === filterId
					? {
							...f,
							values: f.values.map((v) => (v.id === valueId ? { ...v, ...updatedValue } : v)),
					  }
					: f
			);

			// Сохраняем обновленные значения для текущего типа фильтра
			const updatedFilter = newFilters.find((f) => f.id === filterId);
			if (updatedFilter) {
				setFilterTypeValues((prev) => {
					const newMap = new Map(prev);
					if (!newMap.has(filterId)) {
						newMap.set(filterId, new Map());
					}
					const filterMap = newMap.get(filterId)!;

					// Если это не boolean тип, сохраняем значения в общий пул для select/multi_select/range
					if (updatedFilter.type !== "boolean") {
						// Сохраняем в текущий тип
						filterMap.set(updatedFilter.type, [...updatedFilter.values]);
					} else {
						// Для boolean сохраняем только в boolean
						filterMap.set("boolean", [...updatedFilter.values]);
					}

					return newMap;
				});
			}

			return newFilters;
		});

		// Очищаем ошибку конкретного значения при изменении, если значение заполнено
		if (updatedValue.value.trim()) {
			clearFieldError("valueError", filterId, valueId);
		}

		setIsFormChanged(true);
	};

	const deleteFilterValue = (filterId: number, valueId: number) => {
		setFilters((prev) => {
			const newFilters = prev.map((f) => (f.id === filterId ? { ...f, values: f.values.filter((v) => v.id !== valueId) } : f));

			// Сохраняем обновленные значения для текущего типа фильтра
			const updatedFilter = newFilters.find((f) => f.id === filterId);
			if (updatedFilter) {
				setFilterTypeValues((prev) => {
					const newMap = new Map(prev);
					if (!newMap.has(filterId)) {
						newMap.set(filterId, new Map());
					}
					const filterMap = newMap.get(filterId)!;

					// Если это не boolean тип, сохраняем значения в общий пул для select/multi_select/range
					if (updatedFilter.type !== "boolean") {
						// Сохраняем в текущий тип
						filterMap.set(updatedFilter.type, [...updatedFilter.values]);
					} else {
						// Для boolean сохраняем только в boolean
						filterMap.set("boolean", [...updatedFilter.values]);
					}

					return newMap;
				});
			}

			return newFilters;
		});

		// Очищаем ошибку значений при удалении
		clearFieldError("filterValue", filterId);

		setIsFormChanged(true);
	};

	// Функция для очистки пустых фильтров (без названия)
	const cleanupEmptyFilters = () => {
		setFilters((prev) => prev.filter((f) => f.title.trim() !== ""));
	};

	// Проверка, может ли пользователь редактировать эту категорию
	const canEditCategory = () => {
		if (!user) return false;

		// В режиме создания проверяем права на создание
		if (isCreateMode) {
			return user.role === "superadmin" || user.role === "admin";
		}

		// Суперадмин может редактировать любую категорию
		if (user.role === "superadmin") return true;

		// Админ может редактировать категории
		if (user.role === "admin") {
			return true;
		}

		return false;
	};

	// Проверка, может ли пользователь удалить эту категорию
	const canDeleteCategory = () => {
		if (!user) return false;
		return user.role === "superadmin";
	};

	// Функция для удаления категории
	const handleDeleteCategory = () => {
		setShowDeleteModal(true);
	};

	// Функция для подтверждения удаления
	const confirmDelete = async () => {
		if (!category?.id) return;

		try {
			const res = await fetch(`/api/categories/${category.id}`, {
				method: "DELETE",
			});

			if (res.ok) {
				const result = await res.json();
				showSuccessToast("Категория успешно удалена");

				// Показываем дополнительную информацию о том, что было удалено
				if (result.deletedProducts > 0 || result.deletedDepartments > 0) {
					setTimeout(() => {
						alert(`Дополнительная информация:\nУдалено товаров: ${result.deletedProducts}\nОтделов освобождено от категории: ${result.deletedDepartments}`);
					}, 1000);
				}

				router.push("/admin/categories");
			} else {
				const error = await res.json();
				showErrorToast(`Ошибка: ${error.error}`);
			}
		} catch (error) {
			console.error("Ошибка при удалении категории:", error);
			showErrorToast("Произошла ошибка при удалении категории");
		}
	};

	// Обработчики для работы с изображением
	const handleImageChange = (file: File | null) => {
		setFormImage(file);
		setIsFormChanged(true);
	};

	const handleImageRemove = () => {
		setFormImage(null);
		setImagePreview("");
		setIsFormChanged(true);
	};

	// Отслеживаем изменения в форме
	useEffect(() => {
		// Сравниваем с исходными данными
		const hasTitleChanged = formTitle !== originalTitle;
		const hasImageChanged = imagePreview !== originalImage;

		// Сравниваем фильтры с исходными
		const hasFiltersChanged = JSON.stringify(filters) !== JSON.stringify(initialData?.filters || []);

		const isDirty = hasTitleChanged || hasImageChanged || hasFiltersChanged;

		setIsFormChanged(isDirty);
	}, [formTitle, originalTitle, imagePreview, originalImage, filters, initialData?.filters]);

	// Функция для сохранения всех изменений категории
	const handleSave = async () => {
		try {
			// Создаем FormData для отправки файла
			const formData = new FormData();
			formData.append("title", formTitle);
			if (formImage) {
				formData.append("image", formImage);
			}
			// Добавляем только непустые фильтры в JSON формате
			const nonEmptyFilters = filters.filter((f) => f.title.trim() !== "");
			formData.append("filters", JSON.stringify(nonEmptyFilters));

			let res;

			if (isCreateMode) {
				// Создание новой категории
				res = await fetch(`/api/categories`, {
					method: "POST",
					body: formData,
					credentials: "include",
				});
			} else {
				// Обновление существующей категории
				res = await fetch(`/api/categories/${category?.id}`, {
					method: "PATCH",
					body: formData,
					credentials: "include",
				});
			}

			if (res.ok) {
				const updated = await res.json();

				if (isCreateMode) {
					// После создания перенаправляем на страницу категории
					showSuccessToast("Категория успешно создана");
					router.push(`/admin/categories/${updated.id}`);
					return;
				} else {
					// Обновление существующей категории
					setCategory(updated);
					setOriginalTitle(formTitle);
					setOriginalImage(imagePreview);

					// Обновляем исходные данные фильтров
					setFilters(filters);
					// Обновляем initialData для корректного сравнения
					if (initialData) {
						initialData.filters = filters;
					}

					// Сбрасываем флаги изменений
					setIsFormChanged(false);

					// Очищаем сохраненные значения типов фильтров
					setFilterTypeValues(new Map());

					// Очищаем все ошибки валидации
					setValidationErrors({
						filterTitles: {},
						filterValues: {},
						valueErrors: {},
					});

					showSuccessToast("Изменения сохранены");
				}
			} else {
				const { error } = await res.json();
				showErrorToast(error || "Ошибка при сохранении изменений");
				return;
			}
		} catch (err) {
			console.error(err);
			showErrorToast("Ошибка запроса при сохранении изменений");
			return;
		}

		// Закрываем модальное окно
		setShowConfirmChangesModal(false);
	};

	// Проверяем общие изменения
	const hasAnyChanges = isCreateMode ? formTitle.trim() !== "" || formImage !== null || filters.length > 0 : isFormChanged;

	// Функция для получения описания изменений
	const getChangesDescription = () => {
		const changes: string[] = [];

		// Проверяем изменения в названии
		if (formTitle.trim() !== originalTitle) {
			changes.push(`Название: "${originalTitle}" → "${formTitle}"`);
		}

		// Проверяем изменения в изображении
		if (formImage) {
			changes.push("Изображение: будет загружено новое изображение");
		}

		// Проверяем изменения в фильтрах
		const originalFilters = initialData?.filters || [];

		// Добавленные фильтры
		const addedFilters = filters.filter((filter) => !originalFilters.find((orig) => orig.id === filter.id));
		if (addedFilters.length > 0) {
			changes.push(`Добавлено фильтров: ${addedFilters.length}`);
		}

		// Удаленные фильтры
		const deletedFilters = originalFilters.filter((orig) => !filters.find((filter) => filter.id === orig.id));
		if (deletedFilters.length > 0) {
			changes.push(`Удалено фильтров: ${deletedFilters.length}`);
		}

		// Измененные фильтры
		const modifiedFilters = filters.filter((filter) => {
			const original = originalFilters.find((orig) => orig.id === filter.id);
			if (!original) return false;

			return (
				filter.title !== original.title ||
				filter.type !== original.type ||
				filter.unit !== original.unit ||
				filter.values.length !== original.values.length ||
				filter.values.some((value, index) => original.values[index]?.value !== value.value)
			);
		});
		if (modifiedFilters.length > 0) {
			changes.push(`Изменено фильтров: ${modifiedFilters.length}`);
		}

		// Детальные изменения в фильтрах (включая единицы измерения и значения)
		filters.forEach((filter) => {
			const original = originalFilters.find((orig) => orig.id === filter.id);
			if (!original) return;

			// Собираем все изменения для этого фильтра
			const filterChanges: string[] = [];

			// Проверяем изменения в единице измерения
			if (filter.unit !== original.unit) {
				const oldUnit = original.unit || "не указана";
				const newUnit = filter.unit || "не указана";
				filterChanges.push(`единица измерения: "${oldUnit}" → "${newUnit}"`);
			}

			// Проверяем изменения в значениях фильтров
			if (filter.type === "boolean") {
				// Для boolean фильтров НЕ сортируем значения, чтобы сохранить порядок
				const originalValues = original.values.map((v) => v.value);
				const currentValues = filter.values.map((v) => v.value);

				if (JSON.stringify(originalValues) !== JSON.stringify(currentValues)) {
					const oldValues = originalValues.length > 0 ? originalValues.join(", ") : "нет значений";
					const newValues = currentValues.length > 0 ? currentValues.join(", ") : "нет значений";
					filterChanges.push(`значения: "${oldValues}" → "${newValues}"`);
				}
			} else if (filter.type !== "range") {
				// Для остальных типов фильтров (кроме range) сортируем значения
				const originalValues = original.values.map((v) => v.value).sort();
				const currentValues = filter.values.map((v) => v.value).sort();

				if (JSON.stringify(originalValues) !== JSON.stringify(currentValues)) {
					const oldValues = originalValues.length > 0 ? originalValues.join(", ") : "нет значений";
					const newValues = currentValues.length > 0 ? currentValues.join(", ") : "нет значений";
					filterChanges.push(`значения: "${oldValues}" → "${newValues}"`);
				}
			}

			// Если есть изменения в этом фильтре, добавляем их
			if (filterChanges.length > 0) {
				changes.push(`FILTER_START:${filter.title}`);
				filterChanges.forEach((change) => {
					changes.push(`FILTER_CHANGE:${change}`);
				});
				changes.push(`FILTER_END`);
			}
		});

		return changes;
	};

	// Функция для показа модального окна подтверждения
	const handleSaveClick = () => {
		if (hasAnyChanges) {
			// Проверяем валидацию при первом нажатии на кнопку "Сохранить"
			if (!validateForm()) {
				showErrorToast("Пожалуйста, исправьте ошибки в форме");
				return;
			}
			setShowConfirmChangesModal(true);
		}
	};

	if (!category) {
		return <div className="text-center">Категория не найдена</div>;
	}

	return (
		<>
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer">
						{isCreateMode ? <div className={`tabTitle`}>Создание новой категории</div> : <div className={`tabTitle`}>Управление категорией</div>}
					</div>

					<div className="tableContent">
						{/* Показываем предупреждение если пользователь не может редактировать категорию */}
						{!canEditCategory() && user && (
							<div
								style={{
									backgroundColor: "#fef3c7",
									border: "1px solid #f59e0b",
									borderRadius: "8px",
									padding: "12px 16px",
									marginBottom: "16px",
									color: "#92400e",
									fontSize: "14px",
								}}
							>
								⚠️ У вас нет прав на редактирование этой категории. Вы можете только просматривать информацию.
							</div>
						)}

						<div className={`titleBlock`}>
							<div className={"titleInputWrapper"}>
								<input
									type="text"
									value={formTitle}
									onChange={(e) => {
										setFormTitle(e.target.value);
										// Очищаем ошибку при вводе
										if (e.target.value.trim()) {
											clearFieldError("categoryTitle");
										}
									}}
									className={`formInput titleInput ${validationErrors.categoryTitle ? "error" : ""}`}
									placeholder="Введите название категории"
									disabled={!canEditCategory()}
								/>
								{validationErrors.categoryTitle && <div className="errorMessage">{validationErrors.categoryTitle}</div>}
							</div>
							{canDeleteCategory() && category.id && (
								<button onClick={handleDeleteCategory} className={`button cancelButton`}>
									<Trash2 size={18} />
									Удалить категорию
								</button>
							)}
						</div>

						<div className={`sectionsContent ${styles.sectionsContent}`}>
							{/* Секция изображения */}
							<div className={`block sectionBlock ${styles.sectionBlock}`}>
								<h2 className={`sectionTitle`}>Изображение категории</h2>
								<ImageUpload imageUrl={imagePreview} onImageChange={handleImageChange} onImageRemove={handleImageRemove} disabled={!canEditCategory()} />
							</div>

							{/* Секция фильтров */}
							<div className={`block sectionBlock ${styles.sectionBlock}`}>
								<div className={`ssectionHeaderBlock`}>
									<h2 className={`sectionTitle`}>Фильтры категории</h2>
									<p className={`sectionDescription ${styles.sectionDescription}`}>Фильтры помогают пользователям находить товары в этой категории</p>
								</div>

								{/* Список фильтров */}
								<div className={`filtersList ${styles.filtersList}`}>
									{filters.length === 0 ? (
										<div className={`emptyFilters ${styles.emptyFilters}`}>
											<p>Фильтры не добавлены</p>
											<p>Добавьте фильтры, чтобы пользователи могли легко находить товары</p>
										</div>
									) : (
										filters.map((filter) => (
											<FilterCard
												key={filter.id}
												filter={filter}
												onDelete={() => deleteFilter(filter.id)}
												onUpdateFilter={(filterId: number, updatedFilter: Partial<CategoryFilter>) => updateFilter(filterId, updatedFilter)}
												onAddValue={(value: Omit<FilterValue, "id">) => addFilterValue(filter.id, value)}
												onUpdateValue={(valueId: number, updatedValue: Omit<FilterValue, "id">) => updateFilterValue(filter.id, valueId, updatedValue)}
												onDeleteValue={(valueId: number) => deleteFilterValue(filter.id, valueId)}
												titleError={validationErrors.filterTitles[filter.id]}
												valuesError={validationErrors.filterValues[filter.id]}
												valueErrors={validationErrors.valueErrors[filter.id]}
												onClearTitleError={() => clearFieldError("filterTitle", filter.id)}
												onClearValuesError={() => clearFieldError("filterValue", filter.id)}
												onClearValueError={(valueId: number) => clearFieldError("valueError", filter.id, valueId)}
											/>
										))
									)}
									{canEditCategory() && (
										<button type="button" onClick={addFilter} className={`addFilterButton ${styles.addFilterButton}`}>
											<Plus size={16} />
											Добавить фильтр
										</button>
									)}
								</div>
							</div>
						</div>
					</div>

					{canEditCategory() && hasAnyChanges && (
						<div className="fixedButtonsBlock">
							<div className="buttonsContent">
								<button onClick={handleSaveClick} className="acceptButton">
									<Check className="" />
									{isCreateMode ? "Создать категорию" : "Сохранить"}
								</button>

								{hasAnyChanges && (
									<button
										onClick={() => {
											if (isCreateMode) {
												// В режиме создания сбрасываем форму
												setFormTitle("");
												setFormImage(null);
												setImagePreview("");
												setFilters([]);
												// Очищаем все ошибки валидации
												setValidationErrors({
													filterTitles: {},
													filterValues: {},
													valueErrors: {},
												});
											} else {
												// В режиме редактирования возвращаем к исходным значениям
												setFormTitle(originalTitle);
												setFormImage(null);
												setImagePreview(originalImage);
												setFilters(initialData?.filters || []);

												// Очищаем сохраненные значения типов фильтров
												setFilterTypeValues(new Map());

												// Очищаем все ошибки валидации
												setValidationErrors({
													filterTitles: {},
													filterValues: {},
													valueErrors: {},
												});

												setIsFormChanged(false);
											}
										}}
										className="cancelButton"
									>
										<X className="" />
										{isCreateMode ? "Очистить" : "Отменить"}
									</button>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Модальное окно подтверждения изменений */}
			<ConfirmPopup
				open={showConfirmChangesModal}
				onCancel={() => setShowConfirmChangesModal(false)}
				onConfirm={handleSave}
				title={isCreateMode ? "Подтверждение создания категории" : "Подтверждение изменений"}
				confirmText={isCreateMode ? "Создать категорию" : "Сохранить изменения"}
				cancelText="Отмена"
			>
				<div className="changesBlock">
					<div className="changesTitleBlock">
						<p>{isCreateMode ? "Вы собираетесь создать новую категорию со следующими параметрами:" : `Вы собираетесь сохранить следующие изменения в категории `}</p>
						{!isCreateMode && <p style={{ fontWeight: "bold", margin: "0 0 10px 0" }}>&quot;{category?.title}&quot;</p>}
					</div>

					{isCreateMode ? (
						// Для режима создания показываем что будет создано
						<div className="changesList">
							{formTitle.trim() !== "" && (
								<div className="changeItem">
									<strong>Название:</strong> {formTitle}
								</div>
							)}
							{formImage && (
								<div className="changeItem">
									<strong>Изображение:</strong> Будет загружено новое изображение
								</div>
							)}
							{filters.length > 0 && (
								<div className="changeItem">
									<strong>Фильтры:</strong> Будет создано {filters.length} фильтров
								</div>
							)}
						</div>
					) : (
						// Для режима редактирования показываем конкретные изменения
						<div className="changesList">
							{(() => {
								const changes = getChangesDescription();
								const elements: React.ReactNode[] = [];
								let currentFilterTitle = "";
								let currentFilterChanges: string[] = [];
								let isInFilter = false;

								changes.forEach((change, index) => {
									if (change.startsWith("FILTER_START:")) {
										// Если уже есть открытый фильтр, закрываем его
										if (isInFilter && currentFilterChanges.length > 0) {
											elements.push(
												<div
													key={`filter-${elements.length}`}
													className="changeItem borderBlock"
													style={{
														padding: "12px 16px",
														margin: "8px 0",
														borderRadius: "8px",
														backgroundColor: "#f8f9fa",
														border: "1px solid #e9ecef",
													}}
												>
													<div style={{ fontWeight: "bold", marginBottom: "8px" }}>{currentFilterTitle}</div>
													{currentFilterChanges.map((filterChange, changeIndex) => {
														const [label, values] = filterChange.split(": ");
														const [oldValue, newValue] = values.split(" → ");

														return (
															<div key={changeIndex} style={{ marginBottom: "4px" }}>
																<span style={{ fontWeight: "500" }}>{label}:</span>{" "}
																<span style={{ textDecoration: "line-through", color: "#dc3545" }}>{oldValue}</span> →{" "}
																<span style={{ color: "#28a745", fontWeight: "500" }}>{newValue}</span>
															</div>
														);
													})}
												</div>
											);
										}

										// Начинаем новый фильтр
										currentFilterTitle = change.replace("FILTER_START:", "");
										currentFilterChanges = [];
										isInFilter = true;
									} else if (change.startsWith("FILTER_CHANGE:")) {
										currentFilterChanges.push(change.replace("FILTER_CHANGE:", ""));
									} else if (change === "FILTER_END") {
										// Закрываем текущий фильтр
										if (currentFilterChanges.length > 0) {
											elements.push(
												<div
													key={`filter-${elements.length}`}
													className="changeItem borderBlock"
													style={{
														padding: "12px 16px",
														margin: "8px 0",
														borderRadius: "8px",
														backgroundColor: "#f8f9fa",
														border: "1px solid #e9ecef",
													}}
												>
													<div style={{ fontWeight: "bold", marginBottom: "8px" }}>{currentFilterTitle}</div>
													{currentFilterChanges.map((filterChange, changeIndex) => {
														const [label, values] = filterChange.split(": ");
														const [oldValue, newValue] = values.split(" → ");

														return (
															<div key={changeIndex} style={{ marginBottom: "4px" }}>
																<span style={{ fontWeight: "500" }}>{label}:</span>{" "}
																<span style={{ textDecoration: "line-through", color: "#dc3545" }}>{oldValue}</span> →{" "}
																<span style={{ color: "#28a745", fontWeight: "500" }}>{newValue}</span>
															</div>
														);
													})}
												</div>
											);
										}
										isInFilter = false;
									} else {
										// Обычные изменения (не фильтры)
										elements.push(
											<div key={index} className="changeItem">
												{change}
											</div>
										);
									}
								});

								return elements;
							})()}
						</div>
					)}
				</div>
			</ConfirmPopup>

			{/* Модальное окно подтверждения удаления */}
			<ConfirmPopup
				open={showDeleteModal}
				onCancel={() => setShowDeleteModal(false)}
				onConfirm={confirmDelete}
				title="Подтверждение удаления"
				message={`Вы действительно хотите удалить категорию "${category?.title}"?\n\n⚠️ Это действие нельзя отменить. При удалении категории:\n• Все товары в этой категории будут удалены\n• У отделов будет убрана эта категория (они останутся в системе)\n• Все связи с фильтрами будут удалены`}
				confirmText="Удалить"
				cancelText="Отмена"
			/>
		</>
	);
}
