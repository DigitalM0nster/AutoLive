"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Order, OrderResponse, OrderStatus } from "@/lib/types";
import styles from "./styles.module.scss";

export default function OrdersPage() {
	const router = useRouter();
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [filters, setFilters] = useState({
		status: "",
		managerId: "",
		departmentId: "",
		clientId: "",
	});

	// Загрузка заказов
	const fetchOrders = async (pageNum: number = 1) => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams({
				page: pageNum.toString(),
				limit: "20",
			});

			// Добавляем фильтры
			if (filters.status) params.append("status", filters.status);
			if (filters.managerId) params.append("managerId", filters.managerId);
			if (filters.departmentId) params.append("departmentId", filters.departmentId);
			if (filters.clientId) params.append("clientId", filters.clientId);

			const response = await fetch(`/api/orders?${params}`);
			const data: OrderResponse = await response.json();

			if (data.error) {
				setError(data.error);
				return;
			}

			setOrders(data.orders || []);
			setTotalPages(data.totalPages || 1);
			setPage(pageNum);
		} catch (err) {
			console.error("Error fetching orders:", err);
			setError("Ошибка при загрузке заказов");
		} finally {
			setLoading(false);
		}
	};

	// Назначение заказа менеджеру
	const assignOrder = async (orderId: number, managerId: number) => {
		try {
			const response = await fetch(`/api/orders/${orderId}/assign`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ managerId }),
			});

			if (response.ok) {
				// Обновляем список заказов
				fetchOrders(page);
			} else {
				const errorData = await response.json();
				setError(errorData.error || "Ошибка при назначении заказа");
			}
		} catch (err) {
			console.error("Error assigning order:", err);
			setError("Ошибка при назначении заказа");
		}
	};

	// Снятие назначения с заказа
	const unassignOrder = async (orderId: number) => {
		try {
			const response = await fetch(`/api/orders/${orderId}/assign`, {
				method: "DELETE",
			});

			if (response.ok) {
				// Обновляем список заказов
				fetchOrders(page);
			} else {
				const errorData = await response.json();
				setError(errorData.error || "Ошибка при снятии назначения");
			}
		} catch (err) {
			console.error("Error unassigning order:", err);
			setError("Ошибка при снятии назначения");
		}
	};

	// Обновление статуса заказа
	const updateOrderStatus = async (orderId: number, status: OrderStatus) => {
		try {
			const response = await fetch(`/api/orders/${orderId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status }),
			});

			if (response.ok) {
				// Обновляем список заказов
				fetchOrders(page);
			} else {
				const errorData = await response.json();
				setError(errorData.error || "Ошибка при обновлении статуса");
			}
		} catch (err) {
			console.error("Error updating order status:", err);
			setError("Ошибка при обновлении статуса");
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
		fetchOrders(1);
	};

	const resetFilters = () => {
		setFilters({
			status: "",
			managerId: "",
			departmentId: "",
			clientId: "",
		});
		setPage(1);
		fetchOrders(1);
	};

	// Форматирование даты
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Получение цвета статуса
	const getStatusColor = (status: OrderStatus) => {
		switch (status) {
			case "created":
				return "statusCreated";
			case "confirmed":
				return "statusConfirmed";
			case "completed":
				return "statusCompleted";
			case "cancelled":
				return "statusCancelled";
			default:
				return "statusDefault";
		}
	};

	// Получение текста статуса
	const getStatusText = (status: OrderStatus) => {
		switch (status) {
			case "created":
				return "Создан";
			case "confirmed":
				return "Подтверждён";
			case "completed":
				return "Выполнен";
			case "cancelled":
				return "Отменён";
			default:
				return status;
		}
	};

	useEffect(() => {
		fetchOrders();
	}, []);

	if (loading && orders.length === 0) {
		return (
			<div className={styles.ordersPageContainer}>
				<div className={styles.ordersPageHeader}>
					<h1>Заказы</h1>
				</div>
				<div className={styles.loadingContainer}>
					<div className={styles.loadingSpinner}></div>
					<p>Загрузка заказов...</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.ordersPageContainer}>
			<div className={styles.ordersPageHeader}>
				<h1>Заказы</h1>
				<div className={styles.headerActions}>
					<button className={styles.createOrderButton} onClick={() => router.push("/admin/orders/create")}>
						Создать заказ
					</button>
					<button className={styles.logsButton} onClick={() => router.push("/admin/orders/logs")}>
						Логи заказов
					</button>
				</div>
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
					<select value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)} className={styles.filterSelect}>
						<option value="">Все статусы</option>
						<option value="created">Создан</option>
						<option value="confirmed">Подтверждён</option>
						<option value="completed">Выполнен</option>
						<option value="cancelled">Отменён</option>
					</select>

					<input
						type="text"
						placeholder="ID менеджера"
						value={filters.managerId}
						onChange={(e) => handleFilterChange("managerId", e.target.value)}
						className={styles.filterInput}
					/>

					<input
						type="text"
						placeholder="ID отдела"
						value={filters.departmentId}
						onChange={(e) => handleFilterChange("departmentId", e.target.value)}
						className={styles.filterInput}
					/>

					<input
						type="text"
						placeholder="ID клиента"
						value={filters.clientId}
						onChange={(e) => handleFilterChange("clientId", e.target.value)}
						className={styles.filterInput}
					/>
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

			{/* Таблица заказов */}
			<div className={styles.ordersTableContainer}>
				<table className={styles.ordersTable}>
					<thead>
						<tr>
							<th>ID</th>
							<th>Название</th>
							<th>Статус</th>
							<th>Менеджер</th>
							<th>Отдел</th>
							<th>Клиент</th>
							<th>Создан</th>
							<th>Действия</th>
						</tr>
					</thead>
					<tbody>
						{orders.map((order) => (
							<tr key={order.id}>
								<td>{order.id}</td>
								<td>
									<button className={styles.orderTitleLink} onClick={() => router.push(`/admin/orders/${order.id}`)}>
										{order.title}
									</button>
								</td>
								<td>
									<span className={`${styles.statusBadge} ${styles[getStatusColor(order.status)]}`}>{getStatusText(order.status)}</span>
								</td>
								<td>
									{order.manager ? (
										<span className={styles.managerInfo}>
											{order.manager.first_name} {order.manager.last_name}
										</span>
									) : (
										<span className={styles.noManager}>Не назначен</span>
									)}
								</td>
								<td>
									{order.department ? <span className={styles.departmentInfo}>{order.department.name}</span> : <span className={styles.noDepartment}>—</span>}
								</td>
								<td>
									{order.client ? (
										<span className={styles.clientInfo}>
											{order.client.first_name} {order.client.last_name}
										</span>
									) : (
										<span className={styles.noClient}>—</span>
									)}
								</td>
								<td>{formatDate(order.createdAt)}</td>
								<td>
									<div className={styles.orderActions}>
										{!order.managerId && (
											<button
												className={styles.assignButton}
												onClick={() => {
													// Здесь можно добавить модальное окно для выбора менеджера
													// Пока что просто показываем алерт
													alert("Функция назначения менеджера будет добавлена");
												}}
											>
												Назначить
											</button>
										)}
										{order.managerId && (
											<button className={styles.unassignButton} onClick={() => unassignOrder(order.id)}>
												Снять
											</button>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Пагинация */}
			{totalPages > 1 && (
				<div className={styles.paginationContainer}>
					<button onClick={() => fetchOrders(page - 1)} disabled={page === 1} className={styles.paginationButton}>
						Предыдущая
					</button>
					<span className={styles.paginationInfo}>
						Страница {page} из {totalPages}
					</span>
					<button onClick={() => fetchOrders(page + 1)} disabled={page === totalPages} className={styles.paginationButton}>
						Следующая
					</button>
				</div>
			)}

			{orders.length === 0 && !loading && (
				<div className={styles.noOrdersMessage}>
					<p>Заказы не найдены</p>
				</div>
			)}
		</div>
	);
}
