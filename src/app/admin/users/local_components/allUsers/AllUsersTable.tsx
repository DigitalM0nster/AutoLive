"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "../styles.module.scss";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import Pagination from "@/components/ui/pagination/Pagination";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import type { User, ActiveFilter } from "@/lib/types";
import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import { useAuthStore } from "@/store/authStore";

export default function AllUsersTable() {
	const { user } = useAuthStore();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");
	const [roleFilter, setRoleFilter] = useState<"all" | "superadmin" | "admin" | "manager" | "client">("all");
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);

	// Добавляем состояние для поиска
	const [search, setSearch] = useState("");

	// Дропдаун для отдела
	const [departmentFilter, setDepartmentFilter] = useState<number | "all" | "none">("all");
	const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
	const [showDeptDropdown, setShowDeptDropdown] = useState(false);
	const deptDropdownRef = useRef<HTMLDivElement>(null);

	// Опции для CustomSelect
	const departmentOptions = [
		{ value: "all", label: "Все отделы" },
		{ value: "none", label: "Без отдела" },
		...departments.map((dept) => ({ value: dept.id.toString(), label: dept.name })),
	];

	// Опции для статуса
	const statusOptions = [
		{ value: "all", label: "Все статусы" },
		{ value: "verified", label: "Подтверждённые" },
		{ value: "unverified", label: "Неподтверждённые" },
	];

	// Опции для роли
	const roleOptions = [
		{ value: "all", label: "Все роли" },
		{ value: "superadmin", label: "Суперадмин" },
		{ value: "admin", label: "Администратор" },
		{ value: "manager", label: "Менеджер" },
		{ value: "client", label: "Пользователь" },
	];

	const [sortBy, setSortBy] = useState<"id" | "createdAt" | "fullName" | "phone" | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
	const limit = 10;

	const dropdownRef = useRef<HTMLDivElement>(null);

	// Закрытие дропдауна при клике вне его
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setShowStatusDropdown(false);
			}
			if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
				setShowDeptDropdown(false);
			}
		};
		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, []);

	useEffect(() => {
		const fetchUsers = async () => {
			setLoading(true);
			try {
				const params = new URLSearchParams({
					page: page.toString(),
					limit: limit.toString(),
				});

				// Добавляем параметр поиска, если он задан
				if (search) params.append("search", search);

				if (statusFilter !== "all") params.append("status", statusFilter);
				if (roleFilter !== "all") params.append("role", roleFilter);

				// Если выбран конкретный отдел или "без отдела", не добавляем параметр allUsers
				if (departmentFilter === "none") {
					params.append("withoutDepartment", "true");
				} else if (departmentFilter !== "all") {
					params.append("departmentId", departmentFilter.toString());
				} else {
					// Добавляем параметр для получения всех пользователей только если не выбран конкретный отдел
					params.append("allUsers", "true");
				}

				if (sortBy && sortOrder) {
					params.append("sortBy", sortBy);
					params.append("sortOrder", sortOrder);
				}

				const res = await fetch(`/api/users?${params.toString()}`);
				const data = await res.json();
				setUsers(data.users || []);
				setTotal(data.total || 0);
			} catch (e) {
				console.error("Ошибка загрузки пользователей");
			} finally {
				setLoading(false);
			}
		};

		fetchUsers();
	}, [page, statusFilter, roleFilter, sortBy, sortOrder, departmentFilter, search]); // Добавляем search в зависимости

	useEffect(() => {
		const fetchDepartments = async () => {
			try {
				const res = await fetch("/api/departments");
				const data = await res.json();
				setDepartments(Array.isArray(data) ? data : []);
			} catch (e) {
				console.error("Ошибка загрузки отделов");
			}
		};

		fetchDepartments();
	}, []);

	const totalPages = Math.ceil(total / limit);

	// Обработчик изменения отдела через CustomSelect
	const handleDepartmentChange = (value: string) => {
		if (value === "all") {
			setDepartmentFilter("all");
		} else if (value === "none") {
			setDepartmentFilter("none");
		} else {
			setDepartmentFilter(parseInt(value));
		}
		setPage(1);
	};

	// Обработчик изменения статуса через CustomSelect
	const handleStatusChange = (value: string) => {
		setStatusFilter(value as "all" | "verified" | "unverified");
		setPage(1);
	};

	// Обработчик изменения роли через CustomSelect
	const handleRoleChange = (value: string) => {
		setRoleFilter(value as "all" | "superadmin" | "admin" | "manager" | "client");
		setPage(1);
	};

	// Функция для сброса всех фильтров
	const resetFilters = () => {
		setStatusFilter("all");
		setRoleFilter("all");
		setDepartmentFilter("all");
		setSortBy(null);
		setSortOrder(null);
		setSearch(""); // Сбрасываем поиск
		setPage(1);
	};

	// Функция для создания массива активных фильтров
	const getActiveFilters = (): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];

		if (statusFilter !== "all") {
			filters.push({
				key: "status",
				label: "Статус",
				value: statusTitle(statusFilter),
			});
		}

		if (roleFilter !== "all") {
			filters.push({
				key: "role",
				label: "Роль",
				value: roleTitle(roleFilter),
			});
		}

		if (departmentFilter !== "all") {
			filters.push({
				key: "department",
				label: "Отдел",
				value: departmentFilter === "none" ? "Без отдела" : departments.find((d) => d.id === departmentFilter)?.name || "",
			});
		}

		if (sortBy) {
			filters.push({
				key: "sort",
				label: "Сортировка",
				value: `${sortBy === "id" ? "ID" : sortBy === "fullName" ? "ФИО" : "Телефон"} ${sortOrder === "asc" ? "↑" : "↓"}`,
			});
		}

		return filters;
	};

	return (
		<div className={`tableContent ${styles.tableContent}`}>
			{/* Используем переиспользуемый блок фильтров */}
			<FiltersBlock
				activeFilters={getActiveFilters()}
				onResetFilters={resetFilters}
				searchValue={search}
				onSearchChange={setSearch}
				searchPlaceholder="Поиск по ФИО, ID или телефону..."
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
										setPage(1);
									} else if (sortOrder === "asc") {
										setSortOrder("desc");
										setPage(1);
									} else {
										setSortBy(null);
										setSortOrder(null);
										setPage(1);
									}
								}}
							>
								ID
							</th>
							<th
								className={`${styles.tableHeaderCell} sortableHeader ${sortBy === "fullName" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
								onClick={() => {
									if (sortBy !== "fullName") {
										setSortBy("fullName");
										setSortOrder("asc");
									} else if (sortOrder === "asc") {
										setSortOrder("desc");
									} else {
										setSortBy(null);
										setSortOrder(null);
									}
								}}
							>
								ФИО
							</th>
							<th
								className={`${styles.tableHeaderCell} sortableHeader ${sortBy === "phone" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
								onClick={() => {
									if (sortBy !== "phone") {
										setSortBy("phone");
										setSortOrder("asc");
										setPage(1);
									} else if (sortOrder === "asc") {
										setSortOrder("desc");
										setPage(1);
									} else {
										setSortBy(null);
										setSortOrder(null);
										setPage(1);
									}
								}}
							>
								Телефон
							</th>
							<th className={styles.tableHeaderCell}>
								<CustomSelect options={roleOptions} value={roleFilter} onChange={handleRoleChange} placeholder="Выберите роль" className={styles.roleSelect} />
							</th>
							<th className={styles.tableHeaderCell}>
								<CustomSelect
									options={departmentOptions}
									value={departmentFilter === "all" ? "all" : departmentFilter === "none" ? "none" : departmentFilter.toString()}
									onChange={handleDepartmentChange}
									placeholder="Выберите отдел"
									className={styles.departmentSelect}
								/>
							</th>
							<th className={styles.tableHeaderCell}>
								<CustomSelect
									options={statusOptions}
									value={statusFilter}
									onChange={handleStatusChange}
									placeholder="Выберите статус"
									className={styles.statusSelect}
								/>
							</th>
							{user?.role === "superadmin" && <th className={styles.tableHeaderCell}>Действия</th>}
						</tr>
					</thead>
					<tbody className={styles.tableBody}>
						{loading ? (
							<tr>
								<td colSpan={6} className={styles.loadingCell}>
									<Loading />
								</td>
							</tr>
						) : users.length === 0 ? (
							<tr>
								<td colSpan={6} className={styles.emptyCell}>
									Нет пользователей
								</td>
							</tr>
						) : (
							users.map((u) => {
								return (
									<tr key={u.id} className={styles.tableRow}>
										<td className={`idCell ${styles.tableCell}`}>{u.id}</td>
										<td className={styles.tableCell}>
											<a href={`/admin/users/${u.id}`} className={styles.userLink}>
												{`${u.last_name ?? ""} ${u.first_name ?? ""} ${u.middle_name ?? ""}`.trim() || "—"}
											</a>
										</td>
										<td className={styles.tableCell}>{u.phone}</td>
										<td className={`${styles.tableCell} ${styles.capitalize}`}>{roleTitle(u.role)}</td>
										<td className={styles.tableCell}>
											{u.department ? (
												<a href={`/admin/departments/${u.department.id}`} className={styles.departmentLink}>
													{u.department.name}
												</a>
											) : (
												"—"
											)}
										</td>
										<td className={styles.tableCell}>{statusTitle(u.status)}</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
				<Link href="/admin/users/create" className={`createButton`}>
					+ Создать пользователя
				</Link>
			</div>

			{/* Используем компонент Pagination вместо встроенной пагинации */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.usersPagination} />
		</div>
	);
}

function roleTitle(role: string): string {
	switch (role) {
		case "superadmin":
			return "Суперадмин";
		case "admin":
			return "Администратор";
		case "manager":
			return "Менеджер";
		case "client":
			return "Пользователь";
		default:
			return role;
	}
}

function statusTitle(status: string): string {
	switch (status) {
		case "verified":
			return "Подтверждён";
		case "unverified":
			return "Не подтверждён";
		default:
			return status;
	}
}
