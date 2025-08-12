"use client";

import React, { useEffect, useState } from "react";
import styles from "./styles.module.scss";
import { Trash2 } from "lucide-react";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter } from "@/lib/types";
import Link from "next/link";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/rolesConfig";
import Loading from "@/components/ui/loading/Loading";

// Тип для отдела с категориями
type Department = {
	id: number;
	name: string;
	categories: string[];
};

export default function AllDepartmentsTable() {
	const [departments, setDepartments] = useState<Department[]>([]);
	const [loading, setLoading] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

	// Состояние для поиска
	const [search, setSearch] = useState("");

	// Состояние для сортировки
	const [sortBy, setSortBy] = useState<"id" | "name" | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

	// Получаем информацию о текущем пользователе
	const { user, role } = useAuthStore();

	// Функция для проверки прав на удаление отделов
	// Только суперадмин может удалять отделы
	const canDeleteDepartments = () => {
		return role === "superadmin";
	};

	// Загрузка отделов
	useEffect(() => {
		const fetchDepartments = async () => {
			setLoading(true);
			try {
				const res = await fetch("/api/departments");
				const data = await res.json();
				console.log(data);
				setDepartments(Array.isArray(data) ? data : []);
			} catch (e) {
				console.error("Ошибка загрузки отделов:", e);
			} finally {
				setLoading(false);
			}
		};

		fetchDepartments();
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
				value: `${sortBy === "name" ? "Название" : "ID"} ${sortOrder === "asc" ? "↑" : "↓"}`,
			});
		}

		return filters;
	};

	// Функция для сортировки данных
	const sortData = (data: Department[]) => {
		if (!sortBy || !sortOrder) return data;

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
	const filterData = (data: Department[]) => {
		if (!search) return data;

		return data.filter((dept) => dept.name.toLowerCase().includes(search.toLowerCase()));
	};

	// Функция для удаления отдела
	const handleDeleteDepartment = async (department: Department) => {
		setDepartmentToDelete(department);
		setShowDeleteModal(true);
	};

	// Функция для подтверждения удаления
	const confirmDelete = async () => {
		if (!departmentToDelete) return;

		try {
			const res = await fetch(`/api/departments/${departmentToDelete.id}`, {
				method: "DELETE",
			});

			if (res.ok) {
				const result = await res.json();
				// Обновляем список отделов
				setDepartments(departments.filter((dept) => dept.id !== departmentToDelete.id));
				setShowDeleteModal(false);
				setDepartmentToDelete(null);

				// Показываем toast уведомление
				let message = "Отдел успешно удален";
				if (result.deletedProducts > 0 || result.deletedUsers > 0) {
					message += `\nУдалено товаров: ${result.deletedProducts}\nПользователей освобождено от отдела: ${result.deletedUsers}`;
				}
				showSuccessToast(message);
			} else {
				const error = await res.json();
				showErrorToast(`Ошибка: ${error.error}`);
			}
		} catch (error) {
			console.error("Ошибка при удалении отдела:", error);
			showErrorToast("Произошла ошибка при удалении отдела");
		}
	};

	// Функция для отмены удаления
	const cancelDelete = () => {
		setShowDeleteModal(false);
		setDepartmentToDelete(null);
	};

	// Применяем фильтрацию и сортировку
	const processedDepartments = sortData(filterData(departments));

	return (
		<>
			<div className={`tableContent ${styles.tableContent}`}>
				{/* Используем переиспользуемый блок фильтров */}
				<FiltersBlock
					activeFilters={getActiveFilters()}
					onResetFilters={resetFilters}
					searchValue={search}
					onSearchChange={setSearch}
					searchPlaceholder="Поиск по названию отдела..."
					showSearch={true}
				/>

				<div className={styles.tableContainer}>
					<table className={styles.table}>
						<thead className={styles.tableHeader}>
							<tr>
								<th
									className={`${styles.tableHeaderCell} idCell sortableHeader ${sortBy === "id" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
									onClick={() => {
										if (sortBy !== "id") {
											setSortBy("id");
											setSortOrder("asc");
										} else if (sortOrder === "asc") {
											setSortOrder("desc");
										} else {
											setSortBy(null);
											setSortOrder(null);
										}
									}}
								>
									ID
								</th>
								<th
									className={`${styles.tableHeaderCell} sortableHeader ${sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
									onClick={() => {
										if (sortBy !== "name") {
											setSortBy("name");
											setSortOrder("asc");
										} else if (sortOrder === "asc") {
											setSortOrder("desc");
										} else {
											setSortBy(null);
											setSortOrder(null);
										}
									}}
								>
									Название отдела
								</th>
								<th className={styles.tableHeaderCell}>Категории</th>
								<th className={styles.tableHeaderCell}>Действия</th>
							</tr>
						</thead>
						<tbody className={styles.tableBody}>
							{loading ? (
								<tr>
									<td colSpan={4} className={styles.loadingCell}>
										<Loading />
									</td>
								</tr>
							) : processedDepartments.length === 0 ? (
								<tr>
									<td colSpan={4} className={styles.emptyCell}>
										{search ? "Отделы не найдены" : "Нет отделов"}
									</td>
								</tr>
							) : (
								processedDepartments.map((dept) => (
									<tr key={dept.id} className={styles.tableRow}>
										<td className={`${styles.tableCell} idCell`}>{dept.id}</td>
										<td className={styles.tableCell}>
											<Link href={`/admin/departments/${dept.id}`} className={styles.departmentLink}>
												{dept.name}
											</Link>
										</td>
										<td className={styles.tableCell}>
											{dept.categories && dept.categories.length > 0 ? (
												<div className={styles.categoriesList}>
													{dept.categories.map((category, index) => (
														<span key={index} className="category">
															{category}
														</span>
													))}
												</div>
											) : (
												"—"
											)}
										</td>
										<td>
											<div className={styles.buttonsBlock}>
												<Link href={`/admin/departments/${dept.id}`} className="button">
													Просмотр
												</Link>
												{/* Показываем кнопку удаления только суперадмину */}
												{canDeleteDepartments() && (
													<button onClick={() => handleDeleteDepartment(dept)} className="button cancelButton">
														Удалить отдел
														<Trash2 size={16} />
													</button>
												)}
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
					{/* Показываем кнопку создания только суперадмину */}
					{canDeleteDepartments() && (
						<Link href="/admin/departments/create" className={`createButton`}>
							+ Создать отдел
						</Link>
					)}
				</div>
			</div>

			{/* Используем компонент ConfirmPopup вместо встроенного модального окна */}
			<ConfirmPopup open={showDeleteModal} title="Подтверждение удаления" confirmText="Удалить" cancelText="Отмена" onConfirm={confirmDelete} onCancel={cancelDelete}>
				<div>
					<p>
						Вы действительно хотите удалить отдел <strong>"{departmentToDelete?.name}"</strong>?
					</p>
					<p className={styles.warningText}>⚠️ Это действие нельзя отменить. При удалении отдела:</p>
					<ul className={styles.warningList}>
						<li>Все товары в этом отделе будут удалены</li>
						<li>У пользователей будет убран отдел (они останутся в системе)</li>
						<li>Все связи с категориями будут удалены</li>
					</ul>
				</div>
			</ConfirmPopup>
		</>
	);
}
