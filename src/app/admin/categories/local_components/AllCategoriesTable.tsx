"use client";

import React, { useEffect, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import styles from "./styles.module.scss";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter } from "@/lib/types";
import Link from "next/link";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import Loading from "@/components/ui/loading/Loading";
import { Trash2 } from "lucide-react";
import SortableTableRow from "./SortableTableRow";
import ScrollableTableWrapper from "@/components/ui/scrollableTableWrapper/ScrollableTableWrapper";

// Тип для категории
type Category = {
	id: number;
	title: string;
	image?: string;
	filtersCount: number;
	order: number; // Добавляем поле order для отслеживания стандартной сортировки
};

export default function AllCategoriesTable() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

	// Состояние для поиска
	const [search, setSearch] = useState("");

	// Состояние для сортировки
	const [sortBy, setSortBy] = useState<"title" | "filtersCount" | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

	// Получаем информацию о текущем пользователе
	const { user, role } = useAuthStore();

	// Функция для проверки прав на удаление категорий
	// Только суперадмин может удалять категории
	const canDeleteCategories = () => {
		return role === "superadmin";
	};

	// Функция для проверки, находится ли таблица в стандартной сортировке
	// Стандартная сортировка - это когда нет активных фильтров сортировки
	// В этом случае категории отображаются в порядке, заданном полем 'order' в базе данных
	const isStandardSorting = () => {
		return sortBy === null && sortOrder === null && !search;
	};

	// Загрузка категорий
	useEffect(() => {
		const fetchCategories = async () => {
			setLoading(true);
			try {
				const res = await fetch("/api/categories");
				const data = await res.json();
				console.log(data);
				// Преобразуем данные, добавляя поле order
				const categoriesWithOrder = Array.isArray(data)
					? data.map((cat: any) => ({
							...cat,
							order: cat.order || 0,
						}))
					: [];
				setCategories(categoriesWithOrder);
			} catch (e) {
				console.error("Ошибка загрузки категорий:", e);
			} finally {
				setLoading(false);
			}
		};

		fetchCategories();
	}, []);

	// Функция для сброса всех фильтров
	const resetFilters = () => {
		setSortBy(null);
		setSortOrder(null);
		setSearch("");
	};

	// Функция для создания массива активных фильтров
	const getActiveFilters = (): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];

		if (sortBy) {
			filters.push({
				key: "sort",
				label: "Сортировка",
				value: `${sortBy === "title" ? "Название" : "Количество фильтров"} ${sortOrder === "asc" ? "↑" : "↓"}`,
			});
		}

		return filters;
	};

	// Функция для сортировки данных
	const sortData = (data: Category[]) => {
		if (!sortBy || !sortOrder) {
			// Если нет активной сортировки, используем стандартную по полю order
			// Это важно для drag and drop - категории должны быть в правильном порядке
			return [...data].sort((a, b) => a.order - b.order);
		}

		return [...data].sort((a, b) => {
			let aValue: any = a[sortBy];
			let bValue: any = b[sortBy];

			// Для строк используем localeCompare
			if (typeof aValue === "string" && typeof bValue === "string") {
				return sortOrder === "asc" ? aValue.localeCompare(bValue, "ru") : bValue.localeCompare(aValue, "ru");
			}

			// Для чисел используем обычное сравнение
			if (sortOrder === "asc") {
				return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
			} else {
				return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
			}
		});
	};

	// Функция для фильтрации данных
	const filterData = (data: Category[]) => {
		if (!search) return data;

		return data.filter((cat) => cat.title.toLowerCase().includes(search.toLowerCase()));
	};

	// Функция для подтверждения удаления
	const confirmDelete = async () => {
		if (!categoryToDelete) return;

		try {
			const res = await fetch(`/api/categories/${categoryToDelete.id}`, {
				method: "DELETE",
			});

			if (res.ok) {
				const result = await res.json();
				// Обновляем список категорий
				setCategories(categories.filter((cat) => cat.id !== categoryToDelete.id));
				setShowDeleteModal(false);
				setCategoryToDelete(null);

				// Показываем toast уведомление
				let message = "Категория успешно удалена";
				if (result.deletedProducts > 0 || result.deletedDepartments > 0) {
					message += `\nУдалено товаров: ${result.deletedProducts}\nОтделов освобождено от категории: ${result.deletedDepartments}`;
				}
				showSuccessToast(message);
			} else {
				const error = await res.json();
				showErrorToast(`Ошибка: ${error.error}`);
			}
		} catch (error) {
			console.error("Ошибка при удалении категории:", error);
			showErrorToast("Произошла ошибка при удалении категории");
		}
	};

	// Функция для запроса удаления
	const requestDelete = (category: Category) => {
		setCategoryToDelete(category);
		setShowDeleteModal(true);
	};

	// Функция для отмены удаления
	const cancelDelete = () => {
		setShowDeleteModal(false);
		setCategoryToDelete(null);
	};

	// Функция для обработки перетаскивания категорий
	// Эта функция вызывается только когда drag and drop активен (в стандартной сортировке)
	// Когда пользователь перетаскивает категорию, мы:
	// 1. Обновляем локальное состояние для мгновенного отображения
	// 2. Отправляем новый порядок на сервер для сохранения в базе данных
	// 3. Обновляем локальные порядки после успешного сохранения
	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = categories.findIndex((cat) => cat.id === active.id);
		const newIndex = categories.findIndex((cat) => cat.id === over.id);
		const newCategories = arrayMove(categories, oldIndex, newIndex);

		// Обновляем локальное состояние для мгновенного отображения изменений
		setCategories(newCategories);

		try {
			// Отправляем новый порядок на сервер для сохранения в базе данных
			const res = await fetch("/api/categories/reorder", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ids: newCategories.map((cat) => cat.id),
					orders: newCategories.map((cat, index) => ({ id: cat.id, order: index + 1 })),
				}),
			});

			if (res.ok) {
				// Обновляем локальные порядки категорий после успешного сохранения
				// Это гарантирует, что локальное состояние синхронизировано с базой данных
				setCategories((prevCategories) =>
					prevCategories.map((cat) => {
						const newOrder = newCategories.find((newCat) => newCat.id === cat.id);
						return newOrder ? { ...cat, order: newOrder.order } : cat;
					}),
				);
				showSuccessToast("Порядок категорий успешно обновлен");
			} else {
				showErrorToast("Ошибка при обновлении порядка категорий");
			}
		} catch (error) {
			console.error("Ошибка при обновлении порядка категорий:", error);
			showErrorToast("Произошла ошибка при обновлении порядка категорий");
		}
	};

	// Применяем фильтрацию и сортировку
	const processedCategories = sortData(filterData(categories));

	// Определяем, можно ли использовать drag and drop
	// Drag and drop доступен только в стандартной сортировке (без фильтров и сортировки)
	const canUseDragAndDrop = isStandardSorting();

	return (
		<>
			<div className={`tableContent ${styles.tableContent}`}>
				{/* <div className="tableTitle">Список категорий</div> */}
				{/* Используем переиспользуемый блок фильтров */}
				<FiltersBlock
					activeFilters={getActiveFilters()}
					onResetFilters={resetFilters}
					searchValue={search}
					onSearchChange={setSearch}
					searchPlaceholder="Поиск по названию категории..."
					showSearch={true}
				/>

				<div className={styles.tableContainer}>
					{/* Условно включаем DndContext только для стандартной сортировки */}
					{canUseDragAndDrop ? (
						<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
							<SortableContext items={processedCategories.map((cat) => cat.id)} strategy={verticalListSortingStrategy}>
								<ScrollableTableWrapper>
									<table className={styles.table}>
										<thead className={styles.tableHeader}>
											<tr>
												<th className={`dragCell `}></th>
												<th className={`idCell `}>ID</th>
												<th className={`imageCell`}>Изображение</th>
												<th
													className={`sortableHeader ${sortBy === "title" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
													onClick={() => {
														if (sortBy !== "title") {
															setSortBy("title");
															setSortOrder("asc");
														} else if (sortOrder === "asc") {
															setSortOrder("desc");
														} else {
															setSortBy(null);
															setSortOrder(null);
														}
													}}
												>
													Название категории
												</th>
												<th
													className={`${styles.tableHeaderCell} sortableHeader ${sortBy === "filtersCount" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
													onClick={() => {
														if (sortBy !== "filtersCount") {
															setSortBy("filtersCount");
															setSortOrder("asc");
														} else if (sortOrder === "asc") {
															setSortOrder("desc");
														} else {
															setSortBy(null);
															setSortOrder(null);
														}
													}}
												>
													Количество фильтров
												</th>
												<th className={styles.tableHeaderCell}>Действия</th>
											</tr>
										</thead>
										<tbody className={styles.tableBody}>
											{loading ? (
												<tr>
													<td colSpan={6} className={styles.loadingCell}>
														<Loading />
													</td>
												</tr>
											) : processedCategories.length === 0 ? (
												<tr>
													<td colSpan={6} className={styles.emptyCell}>
														{search ? "Категории не найдены" : "Нет категорий"}
													</td>
												</tr>
											) : (
												processedCategories.map((cat) => (
													<SortableTableRow
														key={cat.id}
														id={cat.id}
														title={cat.title}
														image={cat.image}
														filtersCount={cat.filtersCount}
														onDeleteRequest={requestDelete}
														canDelete={canDeleteCategories()}
														canDrag={true} // Передаем флаг что можно перетаскивать
													/>
												))
											)}
										</tbody>
									</table>
								</ScrollableTableWrapper>
							</SortableContext>
						</DndContext>
					) : (
						// Обычная таблица без drag and drop
						<ScrollableTableWrapper>
							<table className={styles.table}>
								<thead className={styles.tableHeader}>
									<tr>
										<th className={`dragCell `}></th>
										<th className={`idCell `}>ID</th>
										<th className={`imageCell`}>Изображение</th>
										<th
											className={`sortableHeader ${sortBy === "title" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
											onClick={() => {
												if (sortBy !== "title") {
													setSortBy("title");
													setSortOrder("asc");
												} else if (sortOrder === "asc") {
													setSortOrder("desc");
												} else {
													setSortBy(null);
													setSortOrder(null);
												}
											}}
										>
											Название категории
										</th>
										<th
											className={`${styles.tableHeaderCell} sortableHeader ${sortBy === "filtersCount" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
											onClick={() => {
												if (sortBy !== "filtersCount") {
													setSortBy("filtersCount");
													setSortOrder("asc");
												} else if (sortOrder === "asc") {
													setSortOrder("desc");
												} else {
													setSortBy(null);
													setSortOrder(null);
												}
											}}
										>
											Количество фильтров
										</th>
										<th className={styles.tableHeaderCell}>Действия</th>
									</tr>
								</thead>
								<tbody className={styles.tableBody}>
									{loading ? (
										<tr>
											<td colSpan={6} className={styles.loadingCell}>
												<Loading />
											</td>
										</tr>
									) : processedCategories.length === 0 ? (
										<tr>
											<td colSpan={6} className={styles.emptyCell}>
												{search ? "Категории не найдены" : "Нет категорий"}
											</td>
										</tr>
									) : (
										processedCategories.map((cat) => (
											<SortableTableRow
												key={cat.id}
												id={cat.id}
												title={cat.title}
												image={cat.image}
												filtersCount={cat.filtersCount}
												onDeleteRequest={requestDelete}
												canDelete={canDeleteCategories()}
												canDrag={false} // Передаем флаг что нельзя перетаскивать
											/>
										))
									)}
								</tbody>
							</table>
						</ScrollableTableWrapper>
					)}
					{/* Показываем кнопку создания только суперадмину */}
					{canDeleteCategories() && (
						<Link href="/admin/categories/create" className={`createButton`}>
							+ Создать категорию
						</Link>
					)}
				</div>
			</div>

			{/* Используем компонент ConfirmPopup вместо встроенного модального окна */}
			<ConfirmPopup open={showDeleteModal} title="Подтверждение удаления" confirmText="Удалить" cancelText="Отмена" onConfirm={confirmDelete} onCancel={cancelDelete}>
				<div>
					<p>
						Вы действительно хотите удалить категорию <strong>&ldquo;{categoryToDelete?.title}&rdquo;</strong>?
					</p>
					<p className={styles.warningText}>⚠️ Это действие нельзя отменить. При удалении категории:</p>
					<ul className={styles.warningList}>
						<li>Все товары в этой категории будут удалены</li>
						<li>У отделов будет убрана эта категория (они останутся в системе)</li>
						<li>Все связи с фильтрами будут удалены</li>
					</ul>
				</div>
			</ConfirmPopup>
		</>
	);
}
