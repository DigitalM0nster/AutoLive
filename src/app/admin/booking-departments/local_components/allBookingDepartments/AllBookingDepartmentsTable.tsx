"use client";

import React, { useEffect, useState } from "react";
import styles from "../../../departments/local_components/styles.module.scss";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter, BookingDepartment } from "@/lib/types";
import Link from "next/link";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import Loading from "@/components/ui/loading/Loading";
import { useRouter } from "next/navigation";
import ScrollableTableWrapper from "@/components/ui/scrollableTableWrapper/ScrollableTableWrapper";

export default function AllBookingDepartmentsTable() {
	const [bookingDepartments, setBookingDepartments] = useState<BookingDepartment[]>([]);
	const [loading, setLoading] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [departmentToDelete, setDepartmentToDelete] = useState<BookingDepartment | null>(null);
	const router = useRouter();

	// Состояние для поиска
	const [search, setSearch] = useState("");

	// Состояние для сортировки
	const [sortBy, setSortBy] = useState<"id" | "name" | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

	// Получаем информацию о текущем пользователе
	const { user, role } = useAuthStore();

	// Функция для проверки прав на управление адресами
	const canManageBookingDepartments = () => {
		return role === "superadmin" || role === "admin";
	};

	// Загрузка отделов для записей
	useEffect(() => {
		const fetchBookingDepartments = async () => {
			setLoading(true);
			try {
				const res = await fetch("/api/booking-departments");
				if (!res.ok) {
					throw new Error("Ошибка загрузки адресов");
				}
				const data = await res.json();
				setBookingDepartments(Array.isArray(data) ? data : []);
			} catch (e) {
				console.error("Ошибка загрузки адресов:", e);
				showErrorToast("Ошибка загрузки адресов");
			} finally {
				setLoading(false);
			}
		};

		fetchBookingDepartments();
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
	const sortData = (data: BookingDepartment[]) => {
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
	const filterData = (data: BookingDepartment[]) => {
		if (!search) return data;

		const searchLower = search.toLowerCase();
		return data.filter(
			(dept) =>
				(dept.name && dept.name.toLowerCase().includes(searchLower)) ||
				(dept.address && dept.address.toLowerCase().includes(searchLower)) ||
				(dept.phones && dept.phones.some((phone) => phone.toLowerCase().includes(searchLower))) ||
				(dept.emails && dept.emails.some((email) => email.toLowerCase().includes(searchLower))),
		);
	};

	// Функция для подтверждения удаления
	const confirmDelete = async () => {
		if (!departmentToDelete) return;

		try {
			const res = await fetch(`/api/booking-departments/${departmentToDelete.id}`, {
				method: "DELETE",
				credentials: "include",
			});

			if (res.ok) {
				// Обновляем список адресов
				setBookingDepartments(bookingDepartments.filter((dept) => dept.id !== departmentToDelete.id));
				setShowDeleteModal(false);
				setDepartmentToDelete(null);
				showSuccessToast("Адрес успешно удален");
			} else {
				const error = await res.json();
				showErrorToast(`Ошибка: ${error.error || "Не удалось удалить адрес"}`);
			}
		} catch (error) {
			console.error("Ошибка при удалении адреса:", error);
			showErrorToast("Произошла ошибка при удалении адреса");
		}
	};

	// Функция для отмены удаления
	const cancelDelete = () => {
		setShowDeleteModal(false);
		setDepartmentToDelete(null);
	};

	// Функция для редактирования адреса
	const handleEdit = (id: number) => {
		router.push(`/admin/booking-departments/${id}/edit`);
	};

	// Применяем фильтрацию и сортировку
	const processedDepartments = sortData(filterData(bookingDepartments));

	return (
		<>
			<div className={`tableContent ${styles.tableContent}`}>
				{/* Используем переиспользуемый блок фильтров */}
				<FiltersBlock
					activeFilters={getActiveFilters()}
					onResetFilters={resetFilters}
					searchValue={search}
					onSearchChange={setSearch}
					searchPlaceholder="Поиск по названию, адресу, телефонам, почтам..."
					showSearch={true}
				/>

				<div className={styles.tableContainer}>
					<ScrollableTableWrapper>
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
										Название
									</th>
									<th className={styles.tableHeaderCell}>Адрес</th>
									<th className={styles.tableHeaderCell}>Телефон</th>
									<th className={styles.tableHeaderCell}>Почты</th>
									{canManageBookingDepartments() && <th className={styles.tableHeaderCell}>Действия</th>}
								</tr>
							</thead>
							<tbody className={styles.tableBody}>
								{loading ? (
									<tr>
										<td colSpan={canManageBookingDepartments() ? 6 : 5} className={styles.loadingCell}>
											<Loading />
										</td>
									</tr>
								) : processedDepartments.length === 0 ? (
									<tr>
										<td colSpan={canManageBookingDepartments() ? 6 : 5} className={styles.emptyCell}>
											{search ? "Адреса не найдены" : "Нет адресов"}
										</td>
									</tr>
								) : (
									processedDepartments.map((dept) => (
										<tr key={dept.id} className={styles.tableRow}>
											<td className={`${styles.tableCell} idCell`}>{dept.id}</td>
											<td className={styles.tableCell}>
												<Link href={`/admin/booking-departments/${dept.id}/edit`} className={styles.departmentLink}>
													{dept.name || "—"}
												</Link>
											</td>
											<td className={styles.tableCell}>{dept.address}</td>
											<td className={styles.tableCell}>
												{dept.phones && dept.phones.length > 0 ? (
													<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
														{dept.phones.map((phone, index) => (
															<span key={index}>{phone}</span>
														))}
													</div>
												) : (
													"—"
												)}
											</td>
											<td className={styles.tableCell}>
												{dept.emails && dept.emails.length > 0 ? (
													<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
														{dept.emails.map((email, index) => (
															<span key={index}>{email}</span>
														))}
													</div>
												) : (
													"—"
												)}
											</td>
											{canManageBookingDepartments() && (
												<td className={styles.tableCell}>
													<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
														<button className="button" style={{ padding: "5px 15px", fontSize: "12px" }} onClick={() => handleEdit(dept.id)}>
															Редактировать
														</button>
														<button
															className="removeButton"
															onClick={() => {
																setDepartmentToDelete(dept);
																setShowDeleteModal(true);
															}}
														>
															Удалить
														</button>
													</div>
												</td>
											)}
										</tr>
									))
								)}
							</tbody>
						</table>
					</ScrollableTableWrapper>
					{/* Показываем кнопку создания только админам и суперадминам */}
					{canManageBookingDepartments() && (
						<Link href="/admin/booking-departments/create" className={`createButton`}>
							+ Создать адрес
						</Link>
					)}
				</div>
			</div>

			{/* Используем компонент ConfirmPopup */}
			<ConfirmPopup open={showDeleteModal} title="Подтверждение удаления" confirmText="Удалить" cancelText="Отмена" onConfirm={confirmDelete} onCancel={cancelDelete}>
				<div>
					<p>
						Вы действительно хотите удалить адрес <strong>&ldquo;{departmentToDelete?.name}&rdquo;</strong>?
					</p>
					<p className={styles.warningText}>⚠️ Это действие нельзя отменить.</p>
					<p className={styles.warningText}>Если есть записи, связанные с этим адресом, удаление будет невозможно.</p>
				</div>
			</ConfirmPopup>
		</>
	);
}
