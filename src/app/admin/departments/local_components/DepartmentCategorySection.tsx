"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Tags, Trash2, ArrowRightLeft, Save, X } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/ToastProvider";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import styles from "./styles.module.scss";
import { Department, Category } from "@/lib/types";

// Интерфейс для категории с количеством товаров
interface CategoryWithCount {
	id: number;
	title: string;
	order: number;
	isAllowed: boolean;
	productCount: number;
}

interface DepartmentCategorySectionProps {
	departmentId?: number;
	onFormChange?: (changed: boolean) => void;
	onSave?: () => Promise<void>;
	onCancel?: () => void;
	// Новые пропсы для передачи данных в родительский компонент
	selectedCategories?: number[];
	onSelectedCategoriesChange?: (categories: number[]) => void;
	// Добавляем пропс для категорий
	categories?: CategoryWithCount[];
	loading?: boolean;
	// Добавляем пропс для количества товаров без категории
	uncategorizedCount?: number;
	// Добавляем пропс для проверки прав на редактирование
	canEdit?: boolean;
}

export default function DepartmentCategorySection({
	departmentId,
	onFormChange,
	onSave,
	onCancel,
	selectedCategories = [],
	onSelectedCategoriesChange,
	categories = [],
	loading = false,
	uncategorizedCount = 0,
	canEdit = true,
}: DepartmentCategorySectionProps) {
	// Состояние для отслеживания изменений
	const [originalCategories, setOriginalCategories] = useState<number[]>([]);
	// Состояние загрузки
	const [saving, setSaving] = useState(false);
	// Состояние для модального окна подтверждения
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [categoriesToRemove, setCategoriesToRemove] = useState<CategoryWithCount[]>([]);

	// Функция для склонения слова "товар" в зависимости от количества
	const getProductWordForm = (count: number): string => {
		const lastDigit = count % 10;
		const lastTwoDigits = count % 100;

		if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
			return "товаров";
		}

		if (lastDigit === 1) {
			return "товар";
		}

		if (lastDigit >= 2 && lastDigit <= 4) {
			return "товара";
		}

		return "товаров";
	};

	// Инициализируем исходное состояние категорий при загрузке
	useEffect(() => {
		if (categories.length > 0) {
			const allowedIds = categories.filter((cat: CategoryWithCount) => cat.isAllowed).map((cat: CategoryWithCount) => cat.id);
			setOriginalCategories(allowedIds);
		}
	}, [categories]);

	// Синхронизируем originalCategories с родительским компонентом
	useEffect(() => {
		if (selectedCategories.length > 0) {
			setOriginalCategories(selectedCategories);
		}
	}, [selectedCategories]);

	// Функция для обработки изменения выбора категории
	const handleCategoryToggle = (categoryId: number) => {
		// Если у пользователя нет прав на редактирование, не выполняем действие
		if (!canEdit) return;

		const newSelected = selectedCategories.includes(categoryId) ? selectedCategories.filter((id) => id !== categoryId) : [...selectedCategories, categoryId];

		onSelectedCategoriesChange?.(newSelected);

		// Проверяем, есть ли изменения
		const hasChanges = JSON.stringify(newSelected.sort()) !== JSON.stringify(originalCategories.sort());
		onFormChange?.(hasChanges);
	};

	return (
		<div className={`block sectionBlock ${styles.sectionBlock}`}>
			<h2 className={`sectionTitle`}>
				<Tags className={`${styles.icon}`} />
				Категории отдела
			</h2>

			{loading ? (
				<div className="loadingBlock">Загрузка категорий...</div>
			) : (
				<>
					<div className={`categoriesList ${styles.categoriesList}`}>
						{categories.length > 0 ? (
							categories.map((category) => {
								return (
									<div key={category.id} className={`categoryItem ${styles.categoryItem}`}>
										<label className={`categoryCheckbox ${styles.categoryCheckbox}`}>
											<div className="categoryRow">
												<input
													type="checkbox"
													checked={selectedCategories.includes(category.id)}
													onChange={() => handleCategoryToggle(category.id)}
													className={styles.checkboxInput}
													disabled={!canEdit}
												/>
												<span className={styles.checkboxLabel}>{category.title}</span>
											</div>
											{selectedCategories.includes(category.id) && (
												<span className={`productCount`}>
													{category.productCount === undefined
														? ""
														: category.productCount === 0
														? "0 товаров"
														: `${category.productCount} ${getProductWordForm(category.productCount)}`}
												</span>
											)}
										</label>
									</div>
								);
							})
						) : (
							<p className={`emptyItem`}>Нет доступных категорий</p>
						)}
					</div>
					{/* Отображение товаров без категории */}
					<div className={`noCategoryItem`}>
						<span className={`categoryTitle`}>Товаров без категории:</span>
						<span className={`productCount`}>{uncategorizedCount} шт.</span>
					</div>
				</>
			)}
		</div>
	);
}
