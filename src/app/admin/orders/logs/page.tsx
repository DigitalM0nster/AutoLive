"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrderLog, OrderLogResponse, OrderLogAction } from "@/lib/types";
import styles from "../styles.module.scss";

export default function OrdersLogsPage() {
	const router = useRouter();
	const [logs, setLogs] = useState<OrderLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [filters, setFilters] = useState({
		action: "",
		orderId: "",
		dateFrom: "",
		dateTo: "",
	});

	// Загрузка логов заказов
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
			if (filters.orderId) params.append("orderId", filters.orderId);
			if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
			if (filters.dateTo) params.append("dateTo", filters.dateTo);

			const response = await fetch(`/api/orders/logs?${params}`);
			const data: OrderLogResponse = await response.json();

			if (data.error) {
				setError(data.error);
				return;
			}

			setLogs(data.data || []);
			setTotalPages(data.totalPages || 1);
			setPage(pageNum);
		} catch (err) {
			console.error("Error fetching order logs:", err);
			setError("Ошибка при загрузке логов заказов");
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
			orderId: "",
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
	const getActionText = (action: OrderLogAction) => {
		switch (action) {
			case "create":
				return "Создание";
			case "update":
				return "Обновление";
			case "assign":
				return "Назначение";
			case "status_change":
				return "Изменение статуса";
			case "cancel":
				return "Отмена";
			case "unassign":
				return "Снятие назначения";
			default:
				return action;
		}
	};

	// Получение цвета действия
	const getActionColor = (action: OrderLogAction) => {
		switch (action) {
			case "create":
				return styles.actionCreate;
			case "update":
				return styles.actionUpdate;
			case "assign":
				return styles.actionAssign;
			case "status_change":
				return styles.actionStatusChange;
			case "cancel":
				return styles.actionCancel;
			case "unassign":
				return styles.actionUnassign;
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
					<h1>Логи заказов</h1>
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
				<h1>Логи заказов</h1>
				<button className={styles.createOrderButton} onClick={() => router.push("/admin/orders")}>
					Назад к заказам
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
						<option value="assign">Назначение</option>
						<option value="status_change">Изменение статуса</option>
						<option value="cancel">Отмена</option>
						<option value="unassign">Снятие назначения</option>
					</select>

					<input
						type="text"
						placeholder="ID заказа"
						value={filters.orderId}
						onChange={(e) => handleFilterChange("orderId", e.target.value)}
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
							<th>Заказ</th>
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
									<button className={styles.orderTitleLink} onClick={() => router.push(`/admin/orders/${log.orderId}`)}>
										Заказ #{log.orderId}
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
