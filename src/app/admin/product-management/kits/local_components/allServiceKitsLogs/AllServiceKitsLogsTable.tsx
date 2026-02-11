"use client";

import styles from "../../../../departments/local_components/styles.module.scss";
import { useCallback, useEffect, useState, useMemo } from "react";
import { ServiceKitLog, ServiceKitLogResponse, User, AdminSnapshotForBookingLog, ServiceKitSnapshotForLog } from "@/lib/types";
import Loading from "@/components/ui/loading/Loading";
import { useRouter } from "next/navigation";
import React from "react";
import Link from "next/link";

export default function AllServiceKitsLogsTable({
	tableHeaders,
	queryParams,
	onLogsUpdate,
	adminSearch,
}: {
	tableHeaders: any;
	queryParams: any;
	onLogsUpdate?: (totalCount: number, totalPages: number) => void;
	adminSearch?: string;
}) {
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [localLogs, setLocalLogs] = useState<ServiceKitLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const router = useRouter();

	// Храним данные для проверки существования
	const [existingUsers, setExistingUsers] = useState<Map<number, User>>(new Map());
	const [existingServiceKits, setExistingServiceKits] = useState<Set<number>>(new Set());

	// Функция для переключения активного состояния блока
	const toggleActiveBlock = useCallback((logId: number | string) => {
		setActiveBlocks((prev) => ({
			...prev,
			[logId]: !prev[logId],
		}));
	}, []);

	// Функция для проверки существования пользователей
	const checkUsersExistence = useCallback(async (userIds: number[]) => {
		if (userIds.length === 0) return;

		try {
			const params = new URLSearchParams();
			params.set("userIds", userIds.join(","));

			const response = await fetch(`/api/users/check-existence?${params.toString()}`, {
				method: "GET",
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				const usersData = data.existingUsers || {};
				const usersMap = new Map(Object.entries(usersData).map(([id, userData]) => [parseInt(id), userData as User]));
				setExistingUsers((prev) => {
					const newMap = new Map(prev);
					usersMap.forEach((value, key) => newMap.set(key, value));
					return newMap;
				});
			}
		} catch (error) {
			console.error("Ошибка при проверке существования пользователей:", error);
		}
	}, []);

	// Функция для проверки существования комплектов ТО
	const checkServiceKitsExistence = useCallback(async (kitIds: number[]) => {
		if (kitIds.length === 0) return;

		try {
			const existingIds: number[] = [];
			await Promise.all(
				kitIds.map(async (id) => {
					try {
						const response = await fetch(`/api/service-kits/${id}`, {
							credentials: "include",
						});
						if (response.ok) {
							existingIds.push(id);
						}
					} catch (error) {
						// Игнорируем ошибки для отдельных комплектов
					}
				})
			);
			setExistingServiceKits((prev) => new Set([...prev, ...existingIds]));
		} catch (error) {
			console.error("Ошибка при проверке существования комплектов ТО:", error);
		}
	}, []);

	// Функция для отображения имени пользователя
	const getUserName = useCallback((user: { first_name: string | null; last_name: string | null; middle_name?: string | null } | null | undefined) => {
		if (!user) return "—";
		return `${user.last_name || ""} ${user.first_name || ""} ${user.middle_name || ""}`.trim() || "—";
	}, []);

	// Функция для отображения роли пользователя
	const getRoleName = useCallback((role: string) => {
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
	}, []);

	// Функция для получения текста действия
	const getActionText = useCallback((action: string) => {
		switch (action) {
			case "create":
				return "Создание";
			case "update":
				return "Редактирование";
			case "delete":
				return "Удаление";
			default:
				return action || "Неизвестное действие";
		}
	}, []);

	// Функция для форматирования даты и времени
	const formatDateTime = useCallback((dateString: string | Date) => {
		if (!dateString) return "—";

		const date = typeof dateString === "string" ? new Date(dateString) : dateString;
		if (isNaN(date.getTime())) return "—";

		return new Intl.DateTimeFormat("ru", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	}, []);

	// Функция для отображения ссылки на администратора
	const renderAdminLink = useCallback(
		(log: ServiceKitLog) => {
			if (!log.adminSnapshot) {
				return "—";
			}

			const admin = log.adminSnapshot;
			const adminLogKey = `admin_${log.id}`;
			const userExists = existingUsers.has(admin.id);
			const actualUser = existingUsers.get(admin.id);

			return (
				<div className="fullInfoBlock">
					<div className={`clickInfoBlock ${activeBlocks[adminLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(adminLogKey)}>
						{getUserName({ first_name: admin.first_name, last_name: admin.last_name })}
					</div>
					<div className={`openingBlock ${activeBlocks[adminLogKey] ? "active" : ""}`}>
						<div className="infoField">
							<span className="title">ID:</span>
							<span className="value">{admin.id}</span>
						</div>
						<div className="infoField">
							<span className="title">Роль:</span>
							<span className="value">{getRoleName(admin.role)}</span>
						</div>
						{admin.department && (
							<div className="infoField">
								<span className="title">Отдел:</span>
								<span className="value">{admin.department.name}</span>
							</div>
						)}
						{userExists && actualUser && (
							<div className="infoField">
								<span className="title maxContent">Профиль:</span>
								<span className="value">
									<Link href={`/admin/users/${admin.id}`} className="itemLink" target="_blank">
										Перейти к профилю
									</Link>
								</span>
							</div>
						)}
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, getUserName, getRoleName, existingUsers]
	);

	// Функция для отображения ссылки на комплект ТО
	const renderServiceKitLink = useCallback(
		(log: ServiceKitLog) => {
			const kitExists = existingServiceKits.has(log.serviceKitId);

			return (
				<div className="fullInfoBlock">
					{kitExists ? (
						<Link href={`/admin/product-management/kits/${log.serviceKitId}`} className="itemLink" target="_blank">
							ID: {log.serviceKitId}
						</Link>
					) : (
						<span className="deletedItem">ID: {log.serviceKitId} (удален)</span>
					)}
				</div>
			);
		},
		[existingServiceKits]
	);

	// Функция для получения блока с результатом действия
	const getResultBlock = useCallback(
		(log: ServiceKitLog): React.ReactNode => {
			const action = log.action;
			const resultLogKey = `result_${log.id}`;

			if (action === "create" || action === "update" || action === "delete") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock`}>
								<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
									{getActionText(action)}
								</div>
								<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
									{log.serviceKitSnapshot && (
										<div className="tableListItem fullInfoBlock">
											<div className="infoField">
												<span className="title">ID:</span>
												<span className="value">{log.serviceKitSnapshot.id}</span>
											</div>
											<div className="infoField">
												<span className="title">Название:</span>
												<span className="value">{log.serviceKitSnapshot.title || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Описание:</span>
												<span className="value">{log.serviceKitSnapshot.description || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Цена:</span>
												<span className="value">{log.serviceKitSnapshot.price || 0} ₽</span>
											</div>
											{log.serviceKitSnapshot.image && (
												<div className="infoField">
													<span className="title">Изображение:</span>
													<span className="value">
														<img src={log.serviceKitSnapshot.image} alt={log.serviceKitSnapshot.title} style={{ maxWidth: "100px", maxHeight: "100px" }} />
													</span>
												</div>
											)}
											{log.message && (
												<div className="infoField">
													<span className="title">Сообщение:</span>
													<span className="value">{log.message}</span>
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			// Для неизвестных действий показываем общую информацию
			return (
				<div className="tableListBlock">
					<div className="tableListItems">
						<div className={`tableListItem fullInfoBlock`}>
							<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
								{getActionText(action)}
							</div>
							<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
								{log.message && (
									<div className="infoField">
										<span className="title">Сообщение:</span>
										<span className="value">{log.message}</span>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, getActionText]
	);

	// Фильтруем логи на клиенте по adminSearch (так как API не поддерживает этот фильтр)
	const filteredLogs = useMemo(() => {
		if (!adminSearch || adminSearch.trim() === "") {
			return localLogs;
		}

		const searchLower = adminSearch.toLowerCase().trim();
		return localLogs.filter((log) => {
			if (!log.adminSnapshot) return false;

			const admin = log.adminSnapshot;
			const adminName = getUserName({ first_name: admin.first_name, last_name: admin.last_name }).toLowerCase();
			const adminId = admin.id.toString();
			const adminRole = admin.role.toLowerCase();

			return adminName.includes(searchLower) || adminId.includes(searchLower) || adminRole.includes(searchLower);
		});
	}, [localLogs, adminSearch, getUserName]);

	useEffect(() => {
		const fetchLogs = async () => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetch(`/api/service-kits/logs?${queryParams.toString()}`, {
					credentials: "include",
				});

				if (!response.ok) {
					throw new Error("Не удалось загрузить логи комплектов ТО");
				}

				const data: ServiceKitLogResponse = await response.json();

				if (data.error) {
					throw new Error(data.error);
				}

				setLocalLogs(data.data || []);
				setTotalPages(data.totalPages || 1);
				setTotalCount(data.total || 0);

				// Уведомляем родительский компонент об обновлении данных
				if (onLogsUpdate) {
					onLogsUpdate(data.total || 0, data.totalPages || 1);
				}

				// Проверяем существование пользователей из логов
				const userIdsToCheck = (data.data || [])
					.map((log: ServiceKitLog) => log.adminSnapshot?.id)
					.filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

				await checkUsersExistence(userIdsToCheck);

				// Проверяем существование комплектов ТО
				const kitIdsToCheck = (data.data || [])
					.map((log: ServiceKitLog) => log.serviceKitId)
					.filter((id: number) => id !== undefined && id !== 0) as number[];

				await checkServiceKitsExistence(kitIdsToCheck);
			} catch (err) {
				console.error("Ошибка при загрузке логов:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			} finally {
				setLoading(false);
			}
		};

		fetchLogs();
	}, [queryParams, checkUsersExistence, checkServiceKitsExistence, onLogsUpdate]);

	return (
		<div className="tableContent">
			<table className={styles.table}>
				<thead className={styles.tableHeader}>{tableHeaders}</thead>
				<tbody className={styles.tableBody}>
					{loading ? (
						<tr>
							<td colSpan={5}>
								<Loading />
							</td>
						</tr>
					) : filteredLogs.length > 0 ? (
						filteredLogs.map((log: ServiceKitLog) => {
							return (
								<tr key={log.id} className={styles.tableRow}>
									<td className={styles.tableCell}>
										<div className="dateCell">{formatDateTime(log.createdAt)}</div>
									</td>
									<td className={styles.tableCell}>
										<div className="actionCell">{getActionText(log.action)}</div>
									</td>
									<td className={styles.tableCell}>{renderAdminLink(log)}</td>
									<td className={styles.tableCell}>{renderServiceKitLink(log)}</td>
									<td className={styles.tableCell}>{getResultBlock(log)}</td>
								</tr>
							);
						})
					) : (
						<tr>
							<td colSpan={5} className={styles.emptyCell}>
								Логи не найдены
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
