"use client";

import React, { useEffect, useState } from "react";
import styles from "./styles.module.scss";
import Pagination from "@/components/ui/pagination/Pagination";
import Loading from "@/components/ui/loading/Loading";
import DataError from "@/components/ui/dataError/DataError";
import { UserLog, UserLogResponse } from "@/lib/types";

type UsersLogsProps = {
	userId?: number; // Опциональный параметр для фильтрации логов по конкретному пользователю
};

export default function UsersLogs({ userId }: UsersLogsProps) {
	const [logs, setLogs] = useState<UserLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [actionFilter, setActionFilter] = useState<string | null>(null);

	useEffect(() => {
		const fetchLogs = async () => {
			setLoading(true);
			setError(null);

			try {
				const params = new URLSearchParams({
					page: page.toString(),
					limit: "20",
				});

				if (actionFilter) {
					params.append("action", actionFilter);
				}

				if (userId) {
					params.append("userId", userId.toString());
				}

				const response = await fetch(`/api/logs/users-actions?${params.toString()}`);

				if (!response.ok) {
					throw new Error("Не удалось загрузить логи пользователей");
				}

				const data: UserLogResponse = await response.json();

				if (data.error) {
					throw new Error(data.error);
				}

				setLogs(data.data || []);
				setTotalPages(data.totalPages || 1);
			} catch (err) {
				console.error("Ошибка при загрузке логов:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			} finally {
				setLoading(false);
			}
		};

		fetchLogs();
	}, [page, actionFilter, userId]);

	// Функция для форматирования даты
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat("ru", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	};

	// Функция для отображения имени пользователя
	const getUserName = (user: { first_name: string | null; last_name: string | null }) => {
		if (!user) return "—";
		return `${user.last_name || ""} ${user.first_name || ""}`.trim() || "—";
	};

	// Функция для отображения роли пользователя
	const getRoleName = (role: string) => {
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
	};

	// Функция для отображения статуса пользователя
	const getStatusName = (status: string) => {
		switch (status) {
			case "verified":
				return "Подтверждён";
			case "unverified":
				return "Не подтверждён";
			default:
				return status;
		}
	};

	// Функция для форматирования значения поля
	const formatFieldValue = (key: string, value: any) => {
		if (value === null || value === undefined) return "—";

		switch (key) {
			case "role":
				return getRoleName(value);
			case "status":
				return getStatusName(value);
			case "departmentId":
				return value === null ? "Без отдела" : `ID: ${value}`;
			case "department":
				return value?.name || "Без отдела";
			default:
				return value.toString();
		}
	};

	if (loading) {
		return <Loading />;
	}

	if (error) {
		return <DataError message={error} />;
	}

	return (
		<div className={styles.logsContainer}>
			<h2 className={styles.logsTitle}>{userId ? "Логи изменений пользователя" : "Логи изменений пользователей"}</h2>

			{/* Фильтры */}
			<div className={styles.logsFilters}>
				<div className={styles.filterGroup}>
					<label>Тип действия:</label>
					<select value={actionFilter || "all"} onChange={(e) => setActionFilter(e.target.value === "all" ? null : e.target.value)} className={styles.filterSelect}>
						<option value="all">Все действия</option>
						<option value="create">Создание</option>
						<option value="update">Редактирование</option>
						<option value="delete">Удаление</option>
					</select>
				</div>
			</div>

			{logs.length === 0 ? (
				<div className={styles.noLogs}>Логи не найдены</div>
			) : (
				<div className={styles.logsList}>
					{logs.map((log) => (
						<div key={log.id} className={styles.logItem}>
							<div className={styles.logHeader}>
								<div className={styles.logAction}>{log.action}</div>
								<div className={styles.logDate}>{formatDate(log.createdAt)}</div>
							</div>

							<div className={styles.logContent}>
								<div className={styles.logInfo}>
									<div className={styles.logInfoItem}>
										<span className={styles.logInfoLabel}>Администратор:</span>
										<span className={styles.logInfoValue}>
											{getUserName(log.admin)} ({getRoleName(log.admin.role)}){log.admin.department && ` - ${log.admin.department.name}`}
										</span>
									</div>

									{log.targetUser && (
										<div className={styles.logInfoItem}>
											<span className={styles.logInfoLabel}>Пользователь:</span>
											<span className={styles.logInfoValue}>
												<a href={`/admin/users/${log.targetUser.id}`} className={styles.userLink}>
													{getUserName(log.targetUser)}
												</a>
												{` (${log.targetUser.phone})`}
											</span>
										</div>
									)}

									{log.message && (
										<div className={styles.logInfoItem}>
											<span className={styles.logInfoLabel}>Сообщение:</span>
											<span className={styles.logInfoValue}>{log.message}</span>
										</div>
									)}
								</div>

								{/* Отображение деталей изменений */}
								{log.action === "Редактирование" && log.details?.diff && log.details.diff.length > 0 && (
									<div className={styles.logChanges}>
										<h4 className={styles.logChangesTitle}>Изменения:</h4>
										<table className={styles.changesTable}>
											<thead>
												<tr>
													<th>Поле</th>
													<th>Было</th>
													<th>Стало</th>
												</tr>
											</thead>
											<tbody>
												{log.details.diff.map((change: any, index: number) => (
													<tr key={index}>
														<td>{change.fieldName}</td>
														<td className={styles.oldValue}>{formatFieldValue(change.key, change.before)}</td>
														<td className={styles.newValue}>{formatFieldValue(change.key, change.after)}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}

								{log.action === "Создание" && log.details?.after && (
									<div className={styles.logChanges}>
										<h4 className={styles.logChangesTitle}>Данные нового пользователя:</h4>
										<div className={styles.newUserData}>
											<div>Телефон: {log.details.after.phone || "—"}</div>
											<div>Имя: {log.details.after.first_name || "—"}</div>
											<div>Фамилия: {log.details.after.last_name || "—"}</div>
											<div>Роль: {getRoleName(log.details.after.role)}</div>
											<div>Статус: {getStatusName(log.details.after.status)}</div>
										</div>
									</div>
								)}

								{log.action === "Удаление" && log.details?.before && (
									<div className={styles.logChanges}>
										<h4 className={styles.logChangesTitle}>Данные удаленного пользователя:</h4>
										<div className={styles.deletedUserData}>
											<div>Телефон: {log.details.before.phone || "—"}</div>
											<div>Имя: {log.details.before.first_name || "—"}</div>
											<div>Фамилия: {log.details.before.last_name || "—"}</div>
											<div>Роль: {getRoleName(log.details.before.role)}</div>
											<div>Статус: {getStatusName(log.details.before.status)}</div>
										</div>
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.logsPagination} />}
		</div>
	);
}
