"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Order, OrderLog, OrderResponse, OrderLogResponse, OrderStatus } from "@/lib/types";
import styles from "../styles.module.scss";

export default function OrderDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const orderId = params.orderId as string;

	const [order, setOrder] = useState<Order | null>(null);
	const [logs, setLogs] = useState<OrderLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [logsLoading, setLogsLoading] = useState(false);

	// Загрузка данных заказа
	const fetchOrder = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch(`/api/orders/${orderId}`);
			const data: OrderResponse = await response.json();

			if (data.error) {
				setError(data.error);
				return;
			}

			setOrder(data.order || null);
		} catch (err) {
			console.error("Error fetching order:", err);
			setError("Ошибка при загрузке заказа");
		} finally {
			setLoading(false);
		}
	};

	// Загрузка логов заказа
	const fetchLogs = async () => {
		try {
			setLogsLoading(true);

			const response = await fetch(`/api/orders/${orderId}/logs?page=1&limit=50`);
			const data: OrderLogResponse = await response.json();

			if (data.error) {
				console.error("Error fetching order logs:", data.error);
				return;
			}

			setLogs(data.data || []);
		} catch (err) {
			console.error("Error fetching order logs:", err);
		} finally {
			setLogsLoading(false);
		}
	};

	// Обновление статуса заказа
	const updateOrderStatus = async (status: OrderStatus) => {
		if (!order) return;

		try {
			const response = await fetch(`/api/orders/${orderId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status }),
			});

			if (response.ok) {
				// Обновляем данные заказа и логи
				fetchOrder();
				fetchLogs();
			} else {
				const errorData = await response.json();
				setError(errorData.error || "Ошибка при обновлении статуса");
			}
		} catch (err) {
			console.error("Error updating order status:", err);
			setError("Ошибка при обновлении статуса");
		}
	};

	// Назначение заказа менеджеру
	const assignOrder = async (managerId: number) => {
		try {
			const response = await fetch(`/api/orders/${orderId}/assign`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ managerId }),
			});

			if (response.ok) {
				// Обновляем данные заказа и логи
				fetchOrder();
				fetchLogs();
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
	const unassignOrder = async () => {
		try {
			const response = await fetch(`/api/orders/${orderId}/assign`, {
				method: "DELETE",
			});

			if (response.ok) {
				// Обновляем данные заказа и логи
				fetchOrder();
				fetchLogs();
			} else {
				const errorData = await response.json();
				setError(errorData.error || "Ошибка при снятии назначения");
			}
		} catch (err) {
			console.error("Error unassigning order:", err);
			setError("Ошибка при снятии назначения");
		}
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
		if (orderId) {
			fetchOrder();
			fetchLogs();
		}
	}, [orderId]);

	if (loading) {
		return (
			<div className={styles.ordersPageContainer}>
				<div className={styles.ordersPageHeader}>
					<h1>Заказ #{orderId}</h1>
				</div>
				<div className={styles.loadingContainer}>
					<div className={styles.loadingSpinner}></div>
					<p>Загрузка заказа...</p>
				</div>
			</div>
		);
	}

	if (error || !order) {
		return (
			<div className={styles.ordersPageContainer}>
				<div className={styles.ordersPageHeader}>
					<h1>Заказ #{orderId}</h1>
					<button className={styles.logsButton} onClick={() => router.push("/admin/orders")}>
						Назад к заказам
					</button>
				</div>
				<div className={styles.errorMessage}>{error || "Заказ не найден"}</div>
			</div>
		);
	}

	return (
		<div className={styles.ordersPageContainer}>
			<div className={styles.ordersPageHeader}>
				<h1>
					Заказ #{order.id} - {order.title}
				</h1>
				<div className={styles.headerActions}>
					<button className={styles.logsButton} onClick={() => router.push("/admin/orders")}>
						Назад к заказам
					</button>
					<button className={styles.createOrderButton} onClick={() => router.push("/admin/orders/logs")}>
						Все логи
					</button>
				</div>
			</div>

			{error && (
				<div className={styles.errorMessage}>
					{error}
					<button onClick={() => setError(null)}>×</button>
				</div>
			)}

			{/* Информация о заказе */}
			<div className={styles.orderDetailsContainer}>
				<div className={styles.orderDetailsCard}>
					<h2>Информация о заказе</h2>
					<div className={styles.orderInfoGrid}>
						<div className={styles.orderInfoItem}>
							<label>Статус:</label>
							<span className={`${styles.statusBadge} ${styles[getStatusColor(order.status)]}`}>{getStatusText(order.status)}</span>
						</div>
						<div className={styles.orderInfoItem}>
							<label>Создан:</label>
							<span>{formatDate(order.createdAt)}</span>
						</div>
						<div className={styles.orderInfoItem}>
							<label>Обновлен:</label>
							<span>{formatDate(order.updatedAt)}</span>
						</div>
						{order.assignedAt && (
							<div className={styles.orderInfoItem}>
								<label>Назначен:</label>
								<span>{formatDate(order.assignedAt)}</span>
							</div>
						)}
						<div className={styles.orderInfoItem}>
							<label>Менеджер:</label>
							<span>
								{order.manager ? (
									<>
										{order.manager.first_name} {order.manager.last_name}
										<br />
										<small className={styles.roleInfo}>
											{order.manager.role}
											{order.manager.department && <> — {order.manager.department.name}</>}
										</small>
									</>
								) : (
									<span className={styles.noManager}>Не назначен</span>
								)}
							</span>
						</div>
						<div className={styles.orderInfoItem}>
							<label>Отдел:</label>
							<span>{order.department ? order.department.name : <span className={styles.noDepartment}>—</span>}</span>
						</div>
						<div className={styles.orderInfoItem}>
							<label>Клиент:</label>
							<span>
								{order.client ? (
									<>
										{order.client.first_name} {order.client.last_name}
										<br />
										<small className={styles.roleInfo}>{order.client.phone}</small>
									</>
								) : (
									<span className={styles.noClient}>—</span>
								)}
							</span>
						</div>
						<div className={styles.orderInfoItem}>
							<label>Создал:</label>
							<span>
								{order.creator.first_name} {order.creator.last_name}
								<br />
								<small className={styles.roleInfo}>
									{order.creator.role}
									{order.creator.department && <> — {order.creator.department.name}</>}
								</small>
							</span>
						</div>
					</div>

					{order.description && (
						<div className={styles.orderDescription}>
							<label>Описание:</label>
							<p>{order.description}</p>
						</div>
					)}

					{/* Действия с заказом */}
					<div className={styles.orderActions}>
						<div className={styles.statusActions}>
							<h3>Изменить статус:</h3>
							<div className={styles.statusButtons}>
								{["created", "confirmed", "completed", "cancelled"].map((status) => (
									<button
										key={status}
										className={`${styles.statusButton} ${order.status === status ? styles.statusButtonActive : ""}`}
										onClick={() => updateOrderStatus(status as OrderStatus)}
									>
										{getStatusText(status as OrderStatus)}
									</button>
								))}
							</div>
						</div>

						<div className={styles.assignmentActions}>
							<h3>Назначение:</h3>
							{order.managerId ? (
								<div className={styles.assignmentInfo}>
									<p>Заказ назначен менеджеру</p>
									<button className={styles.unassignButton} onClick={unassignOrder}>
										Снять назначение
									</button>
								</div>
							) : (
								<div className={styles.assignmentInfo}>
									<p>Заказ свободен</p>
									<button
										className={styles.assignButton}
										onClick={() => {
											// Здесь можно добавить модальное окно для выбора менеджера
											alert("Функция назначения менеджера будет добавлена");
										}}
									>
										Назначить менеджера
									</button>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Позиции заказа */}
				<div className={styles.orderDetailsCard}>
					<h2>Позиции заказа</h2>
					{order.orderItems.length > 0 ? (
						<div className={styles.orderItemsTable}>
							<table className={styles.ordersTable}>
								<thead>
									<tr>
										<th>Артикул</th>
										<th>Название</th>
										<th>Бренд</th>
										<th>Цена</th>
										<th>Количество</th>
										<th>Сумма</th>
									</tr>
								</thead>
								<tbody>
									{order.orderItems.map((item) => (
										<tr key={item.id}>
											<td>{item.product_sku}</td>
											<td>{item.product_title}</td>
											<td>{item.product_brand}</td>
											<td>{item.product_price.toLocaleString("ru-RU")} ₽</td>
											<td>{item.quantity}</td>
											<td>{(item.product_price * item.quantity).toLocaleString("ru-RU")} ₽</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p>Позиции заказа не найдены</p>
					)}
				</div>

				{/* Логи заказа */}
				<div className={styles.orderDetailsCard}>
					<h2>История изменений</h2>
					{logsLoading ? (
						<div className={styles.loadingContainer}>
							<div className={styles.loadingSpinner}></div>
							<p>Загрузка логов...</p>
						</div>
					) : logs.length > 0 ? (
						<div className={styles.orderLogsTable}>
							<table className={styles.ordersTable}>
								<thead>
									<tr>
										<th>Дата</th>
										<th>Действие</th>
										<th>Администратор</th>
										<th>Сообщение</th>
									</tr>
								</thead>
								<tbody>
									{logs.map((log) => (
										<tr key={log.id}>
											<td>{formatDate(log.createdAt)}</td>
											<td>
												<span className={`${styles.statusBadge} ${styles[getActionColor(log.action)]}`}>{getActionText(log.action)}</span>
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
					) : (
						<p>Логи не найдены</p>
					)}
				</div>
			</div>
		</div>
	);
}

// Вспомогательные функции для логов
function getActionText(action: string) {
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
}

function getActionColor(action: string) {
	switch (action) {
		case "create":
			return "actionCreate";
		case "update":
			return "actionUpdate";
		case "assign":
			return "actionAssign";
		case "status_change":
			return "actionStatusChange";
		case "cancel":
			return "actionCancel";
		case "unassign":
			return "actionUnassign";
		default:
			return "actionDefault";
	}
}
