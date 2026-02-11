"use client";

import { useState, useEffect } from "react";
import { ServiceKitLog, ServiceKitLogResponse } from "@/lib/types";
import styles from "../../../../../orders/local_components/styles.module.scss";

// Логи одного комплекта ТО — со страницы [kitId]/logs
export default function ServiceKitLogsContent({ serviceKitId, kitTitle }: { serviceKitId: number; kitTitle: string }) {
	const [logs, setLogs] = useState<ServiceKitLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [actionFilter, setActionFilter] = useState("");

	const fetchLogs = async (pageNum: number = 1) => {
		try {
			setLoading(true);
			setError(null);
			const params = new URLSearchParams({
				page: pageNum.toString(),
				limit: "20",
				serviceKitId: serviceKitId.toString(),
			});
			if (actionFilter) params.append("action", actionFilter);

			const response = await fetch(`/api/service-kits/logs?${params}`, { credentials: "include" });
			const data: ServiceKitLogResponse = await response.json();

			if (data.error) {
				setError((data as { error?: string }).error || "Ошибка загрузки");
				return;
			}
			setLogs(data.data || []);
			setTotalPages(data.totalPages || 1);
			setPage(pageNum);
		} catch (err) {
			console.error("Error fetching service kit logs:", err);
			setError("Ошибка при загрузке логов");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, [serviceKitId, actionFilter]);

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

	const getActionText = (action: string) => {
		switch (action) {
			case "create":
				return "Создание";
			case "update":
				return "Обновление";
			case "delete":
				return "Удаление";
			default:
				return action || "—";
		}
	};

	if (loading && logs.length === 0) {
		return (
			<div className={styles.ordersPageContainer}>
				<div className={styles.loadingContainer}>
					<div className={styles.loadingSpinner}></div>
					<p>Загрузка логов...</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.ordersPageContainer}>
			<div className={styles.ordersFiltersRow}>
				<select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={styles.filterSelect}>
					<option value="">Все действия</option>
					<option value="create">Создание</option>
					<option value="update">Обновление</option>
					<option value="delete">Удаление</option>
				</select>
			</div>

			{error && (
				<div className={styles.errorMessage}>
					{error}
					<button type="button" onClick={() => setError(null)}>
						×
					</button>
				</div>
			)}

			<div className={styles.ordersTableContainer}>
				<table className={styles.ordersTable}>
					<thead>
						<tr>
							<th>ID</th>
							<th>Дата</th>
							<th>Действие</th>
							<th>Кем выполнено</th>
							<th>Сообщение</th>
						</tr>
					</thead>
					<tbody>
						{logs.map((log) => (
							<tr key={log.id}>
								<td>{log.id}</td>
								<td>{formatDate(log.createdAt)}</td>
								<td>{getActionText(log.action)}</td>
								<td>
									{log.adminSnapshot ? (
										<span>
											{log.adminSnapshot.first_name} {log.adminSnapshot.last_name}
											{log.adminSnapshot.role && ` (${log.adminSnapshot.role})`}
										</span>
									) : (
										"—"
									)}
								</td>
								<td>{log.message || "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{totalPages > 1 && (
				<div className={styles.paginationContainer}>
					<button type="button" onClick={() => fetchLogs(page - 1)} disabled={page === 1} className={styles.paginationButton}>
						Предыдущая
					</button>
					<span className={styles.paginationInfo}>
						Страница {page} из {totalPages}
					</span>
					<button type="button" onClick={() => fetchLogs(page + 1)} disabled={page === totalPages} className={styles.paginationButton}>
						Следующая
					</button>
				</div>
			)}

			{logs.length === 0 && !loading && (
				<div className={styles.noOrdersMessage}>
					<p>По комплекту «{kitTitle}» логов пока нет</p>
				</div>
			)}
		</div>
	);
}
