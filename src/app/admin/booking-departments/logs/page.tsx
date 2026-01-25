"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookingDepartmentLog, BookingDepartmentLogResponse, BookingDepartmentLogAction } from "@/lib/types";
import styles from "../../orders/local_components/styles.module.scss";

export default function BookingDepartmentsLogsPage() {
	const router = useRouter();
	const [logs, setLogs] = useState<BookingDepartmentLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [filters, setFilters] = useState({
		action: "",
		bookingDepartmentId: "",
		dateFrom: "",
		dateTo: "",
	});

	// Загрузка логов адресов
	const fetchLogs = async (pageNum: number = 1) => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams({
				page: pageNum.toString(),
				limit: "20",
			});

			// Добавляем фильтры
			if (filters.action) params.append("action", filters.action);
			if (filters.bookingDepartmentId) params.append("bookingDepartmentId", filters.bookingDepartmentId);
			if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
			if (filters.dateTo) params.append("dateTo", filters.dateTo);

			const response = await fetch(`/api/booking-departments/logs?${params}`, { credentials: "include" });
			const data: BookingDepartmentLogResponse = await response.json();

			if (data.error) {
				setError(data.error);
				return;
			}

			setLogs(data.data || []);
			setTotalPages(data.totalPages || 1);
			setPage(pageNum);
		} catch (err) {
			console.error("Error fetching booking department logs:", err);
			setError("Ошибка при загрузке логов адресов");
		} finally {
			setLoading(false);
		}
	};

	// Обработчики фильтров
	const handleFilterChange = (key: string, value: string) => {
		setFilters((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	const applyFilters = () => {
		setPage(1);
		fetchLogs(1);
	};

	const resetFilters = () => {
		setFilters({
			action: "",
			bookingDepartmentId: "",
			dateFrom: "",
			dateTo: "",
		});
		setPage(1);
		fetchLogs(1);
	};

	// Форматирование даты
	const formatDate = (date: string | Date) => {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		return dateObj.toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Получение текста действия
	const getActionText = (action: BookingDepartmentLogAction | string) => {
		switch (action) {
			case "create":
				return "Создание";
			case "update":
				return "Обновление";
			case "delete":
				return "Удаление";
			default:
				return action || "Неизвестное действие";
		}
	};

	// Получение цвета действия
	const getActionColor = (action: BookingDepartmentLogAction | string) => {
		switch (action) {
			case "create":
				return styles.actionCreate;
			case "update":
				return styles.actionUpdate;
			case "delete":
				return styles.actionCancel;
			default:
				return styles.actionDefault;
		}
	};

	useEffect(() => {
		fetchLogs();
	}, []);

	if (loading && logs.length === 0) {
		return (
			<div className={styles.ordersPageContainer}>
				<div className={styles.ordersPageHeader}>
					<h1>Логи адресов</h1>
				</div>
				<div className={styles.loadingContainer}>
					<div className={styles.loadingSpinner}></div>
					<p>Загрузка логов...</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.ordersPageContainer}>
			<div className={styles.ordersPageHeader}>
				<h1>Логи адресов</h1>
				<button className={styles.createOrderButton} onClick={() => router.push("/admin/booking-departments")}>
					Назад к адресам
				</button>
			</div>

			{error && (
				<div className={styles.errorMessage}>
					{error}
					<button onClick={() => setError(null)}>×</button>
				</div>
			)}

			{/* Фильтры */}
			<div className={styles.ordersFiltersContainer}>
				<div className={styles.ordersFiltersRow}>
					<select value={filters.action} onChange={(e) => handleFilterChange("action", e.target.value)} className={styles.filterSelect}>
						<option value="">Все действия</option>
						<option value="create">Создание</option>
						<option value="update">Обновление</option>
						<option value="delete">Удаление</option>
					</select>

					<input
						type="text"
						placeholder="ID адреса"
						value={filters.bookingDepartmentId}
						onChange={(e) => handleFilterChange("bookingDepartmentId", e.target.value)}
						className={styles.filterInput}
					/>

					<input
						type="date"
						placeholder="Дата от"
						value={filters.dateFrom}
						onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
						className={styles.filterInput}
					/>

					<input type="date" placeholder="Дата до" value={filters.dateTo} onChange={(e) => handleFilterChange("dateTo", e.target.value)} className={styles.filterInput} />
				</div>

				<div className={styles.ordersFiltersActions}>
					<button onClick={applyFilters} className={styles.applyFiltersButton}>
						Применить фильтры
					</button>
					<button onClick={resetFilters} className={styles.resetFiltersButton}>
						Сбросить фильтры
					</button>
				</div>
			</div>

			{/* Таблица логов */}
			<div className={styles.ordersTableContainer}>
				<table className={styles.ordersTable}>
					<thead>
						<tr>
							<th>ID</th>
							<th>Дата</th>
							<th>Действие</th>
							<th>Адрес</th>
							<th>Администратор</th>
							<th>Сообщение</th>
						</tr>
					</thead>
					<tbody>
						{logs.map((log) => (
							<tr key={log.id}>
								<td>{log.id}</td>
								<td>{formatDate(log.createdAt)}</td>
								<td>
									<span className={`${styles.statusBadge} ${getActionColor(log.action)}`}>{getActionText(log.action)}</span>
								</td>
								<td>
									<button className={styles.orderTitleLink} onClick={() => router.push(`/admin/booking-departments/${log.bookingDepartmentId}/edit`)}>
										Адрес #{log.bookingDepartmentId}
									</button>
								</td>
								<td>
									{log.adminSnapshot ? (
										<span className={styles.managerInfo}>
											{log.adminSnapshot.first_name} {log.adminSnapshot.last_name}
											<br />
											<small className={styles.roleInfo}>
												{log.adminSnapshot.role}
												{log.adminSnapshot.department && <> — {log.adminSnapshot.department.name}</>}
											</small>
										</span>
									) : (
										<span className={styles.noManager}>—</span>
									)}
								</td>
								<td>
									<span className={styles.logMessage}>{log.message || "—"}</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Пагинация */}
			{totalPages > 1 && (
				<div className={styles.paginationContainer}>
					<button onClick={() => fetchLogs(page - 1)} disabled={page === 1} className={styles.paginationButton}>
						Предыдущая
					</button>
					<span className={styles.paginationInfo}>
						Страница {page} из {totalPages}
					</span>
					<button onClick={() => fetchLogs(page + 1)} disabled={page === totalPages} className={styles.paginationButton}>
						Следующая
					</button>
				</div>
			)}

			{logs.length === 0 && !loading && (
				<div className={styles.noOrdersMessage}>
					<p>Логи не найдены</p>
				</div>
			)}
		</div>
	);
}
