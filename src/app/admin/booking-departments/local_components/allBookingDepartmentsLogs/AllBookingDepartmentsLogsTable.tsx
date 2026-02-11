"use client";

import styles from "../../../departments/local_components/styles.module.scss";
import { useCallback, useEffect, useState, useMemo } from "react";
import { BookingDepartmentLog, BookingDepartmentLogResponse, User } from "@/lib/types";
import Loading from "@/components/ui/loading/Loading";
import { useRouter } from "next/navigation";
import React from "react";

export default function AllBookingDepartmentsLogsTable({
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
	const [localLogs, setLocalLogs] = useState<BookingDepartmentLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const router = useRouter();

	// Храним данные для проверки существования
	const [existingUsers, setExistingUsers] = useState<Map<number, User>>(new Map());
	const [existingBookingDepartments, setExistingBookingDepartments] = useState<Set<number>>(new Set());
	const [bookingDepartmentsData, setBookingDepartmentsData] = useState<Map<number, { id: number; name: string | null; address: string }>>(new Map());

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

	// Функция для проверки существования адресов
	const checkBookingDepartmentsExistence = useCallback(async (departmentIds: number[]) => {
		if (departmentIds.length === 0) return;

		try {
			const existingIds: number[] = [];
			await Promise.all(
				departmentIds.map(async (id) => {
					try {
						const response = await fetch(`/api/booking-departments/${id}`, {
							credentials: "include",
						});
						if (response.ok) {
							existingIds.push(id);
						}
					} catch (error) {
						// Игнорируем ошибки для отдельных адресов
					}
				})
			);
			setExistingBookingDepartments((prev) => new Set([...prev, ...existingIds]));
		} catch (error) {
			console.error("Ошибка при проверке существования адресов:", error);
		}
	}, []);

	// Функция для загрузки данных адресов
	const loadBookingDepartmentsData = useCallback(async () => {
		try {
			const response = await fetch(`/api/booking-departments`, {
				credentials: "include",
			});

			if (response.ok) {
				const departments = await response.json();
				const departmentsMap = new Map<number, { id: number; name: string | null; address: string }>(
					departments.map((dept: { id: number; name: string | null; address: string }) => [dept.id, dept])
				);
				setBookingDepartmentsData(departmentsMap);
			}
		} catch (error) {
			console.error("Ошибка при загрузке данных адресов:", error);
		}
	}, []);

	// Функция для отображения имени пользователя
	const getUserName = useCallback((user: { first_name: string | null; last_name: string | null; middle_name?: string | null }) => {
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
		(log: BookingDepartmentLog) => {
			if (!log.adminSnapshot) {
				return "—";
			}

			const admin = log.adminSnapshot;
			const adminLogKey = `admin_${log.id}`;
			const userExists = existingUsers.has(admin.id);
			const actualUser = existingUsers.get(admin.id);

			return (
				<div className={`fullInfoBlock`}>
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
									<a href={`/admin/users/${admin.id}`} className="itemLink">
										{getUserName({ first_name: actualUser.first_name, last_name: actualUser.last_name, middle_name: actualUser.middle_name })}
									</a>
								</span>
							</div>
						)}
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, getUserName, getRoleName, existingUsers]
	);

	// Функция для отображения ссылки на адрес
	const renderBookingDepartmentLink = useCallback(
		(log: BookingDepartmentLog) => {
			const deptId = log.bookingDepartmentId;
			if (!deptId) return "—";

			const bookingDepartmentLogKey = `bookingDepartment_${log.id}`;
			const bookingDepartmentExists = existingBookingDepartments.has(deptId);
			const snapshot = log.bookingDepartmentSnapshot;
			const name = snapshot && typeof snapshot === "object" && snapshot.name ? snapshot.name : `Адрес #${deptId}`;
			const address = snapshot && typeof snapshot === "object" && snapshot.address ? snapshot.address : bookingDepartmentsData.get(deptId)?.address || "";

			return (
				<div className={`fullInfoBlock`}>
					<div className={`clickInfoBlock ${activeBlocks[bookingDepartmentLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(bookingDepartmentLogKey)}>
						{name}
					</div>
					<div className={`openingBlock ${activeBlocks[bookingDepartmentLogKey] ? "active" : ""}`}>
						<div className="infoField">
							<span className="title">ID:</span>
							<span className="value">{deptId}</span>
						</div>
						{name && (
							<div className="infoField">
								<span className="title">Название:</span>
								<span className="value">{name}</span>
							</div>
						)}
						{address && (
							<div className="infoField">
								<span className="title">Адрес:</span>
								<span className="value">{address}</span>
							</div>
						)}
						{bookingDepartmentExists && (
							<div className="infoField">
								<span className="title">Просмотр:</span>
								<span className="value">
									<a href={`/admin/booking-departments/${deptId}/edit`} className="itemLink">
										Открыть адрес
									</a>
								</span>
							</div>
						)}
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, existingBookingDepartments, bookingDepartmentsData]
	);

	// Функция для получения блока с результатами
	const getResultBlock = useCallback(
		(log: BookingDepartmentLog): React.ReactNode => {
			const action = log.action;
			const resultLogKey = `result_${log.id}`;
			const snapshot = log.bookingDepartmentSnapshot;

			if (action === "create") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock create`}>
								<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
									Создание адреса
								</div>
								<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
									{snapshot && typeof snapshot === "object" && (
										<div className="tableListItems">
											<div className="tableListItem fullInfoBlock">
												<div className="infoField">
													<span className="title">ID:</span>
													<span className="value">{log.bookingDepartmentId}</span>
												</div>
												{snapshot.name && (
													<div className="infoField">
														<span className="title">Название:</span>
														<span className="value">{snapshot.name}</span>
													</div>
												)}
												{snapshot.address && (
													<div className="infoField">
														<span className="title">Адрес:</span>
														<span className="value">{snapshot.address}</span>
													</div>
												)}
												{snapshot.phones && Array.isArray(snapshot.phones) && snapshot.phones.length > 0 && (
													<div className="infoField">
														<span className="title">Телефоны:</span>
														<span className="value">{snapshot.phones.join(", ")}</span>
													</div>
												)}
												{snapshot.emails && Array.isArray(snapshot.emails) && snapshot.emails.length > 0 && (
													<div className="infoField">
														<span className="title">Email:</span>
														<span className="value">{snapshot.emails.join(", ")}</span>
													</div>
												)}
												{log.message && (
													<div className="infoField">
														<span className="title">Сообщение:</span>
														<span className="value">{log.message}</span>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (action === "update") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock update`}>
								<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
									Редактирование адреса
								</div>
								<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
									{snapshot && typeof snapshot === "object" && (
										<div className="tableListItems">
											<div className="tableListItem fullInfoBlock">
												<div className="infoField">
													<span className="title">ID:</span>
													<span className="value">{log.bookingDepartmentId}</span>
												</div>
												{snapshot.name && (
													<div className="infoField">
														<span className="title">Название:</span>
														<span className="value">{snapshot.name}</span>
													</div>
												)}
												{snapshot.address && (
													<div className="infoField">
														<span className="title">Адрес:</span>
														<span className="value">{snapshot.address}</span>
													</div>
												)}
												{snapshot.phones && Array.isArray(snapshot.phones) && snapshot.phones.length > 0 && (
													<div className="infoField">
														<span className="title">Телефоны:</span>
														<span className="value">{snapshot.phones.join(", ")}</span>
													</div>
												)}
												{snapshot.emails && Array.isArray(snapshot.emails) && snapshot.emails.length > 0 && (
													<div className="infoField">
														<span className="title">Email:</span>
														<span className="value">{snapshot.emails.join(", ")}</span>
													</div>
												)}
												{log.message && (
													<div className="infoField">
														<span className="title">Сообщение:</span>
														<span className="value">{log.message}</span>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (action === "delete") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock remove`}>
								<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
									Удаление адреса
								</div>
								<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
									{snapshot && typeof snapshot === "object" && (
										<div className="tableListItems">
											<div className="tableListItem fullInfoBlock">
												<div className="infoField">
													<span className="title">ID:</span>
													<span className="value">{log.bookingDepartmentId}</span>
												</div>
												{snapshot.name && (
													<div className="infoField">
														<span className="title">Название:</span>
														<span className="value">{snapshot.name ?? "—"}</span>
													</div>
												)}
												{snapshot.address && (
													<div className="infoField">
														<span className="title">Адрес:</span>
														<span className="value">{snapshot.address ?? "—"}</span>
													</div>
												)}
												{log.message && (
													<div className="infoField">
														<span className="title">Сообщение:</span>
														<span className="value">{log.message}</span>
													</div>
												)}
											</div>
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
								{log.action || "Неизвестное действие"}
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
		[activeBlocks, toggleActiveBlock]
	);

	// Фильтруем логи на клиенте по adminSearch (так как API не поддерживает этот фильтр полностью)
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
				const response = await fetch(`/api/booking-departments/logs?${queryParams.toString()}`, {
					credentials: "include",
				});

				if (!response.ok) {
					throw new Error("Не удалось загрузить логи адресов");
				}

				const data: BookingDepartmentLogResponse = await response.json();

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
					.map((log: BookingDepartmentLog) => log.adminSnapshot?.id)
					.filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

				await checkUsersExistence(userIdsToCheck);

				// Проверяем существование адресов
				const bookingDepartmentIdsToCheck = (data.data || [])
					.map((log: BookingDepartmentLog) => log.bookingDepartmentId)
					.filter((id: number) => id !== undefined && id !== 0) as number[];

				await checkBookingDepartmentsExistence(bookingDepartmentIdsToCheck);
			} catch (err) {
				console.error("Ошибка при загрузке логов:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			} finally {
				setLoading(false);
			}
		};

		fetchLogs();
	}, [queryParams, checkUsersExistence, checkBookingDepartmentsExistence, onLogsUpdate]);

	// Загружаем данные адресов при монтировании компонента
	useEffect(() => {
		loadBookingDepartmentsData();
	}, [loadBookingDepartmentsData]);

	return (
		<div className={`tableContent`}>
			<table className={styles.table}>
				<thead className={styles.tableHeader}>{tableHeaders}</thead>
				<tbody className={styles.tableBody}>
					{loading ? (
						<tr>
							<td colSpan={4}>
								<Loading />
							</td>
						</tr>
					) : filteredLogs.length > 0 ? (
						filteredLogs.map((log: BookingDepartmentLog) => {
							return (
								<tr key={log.id} className={styles.tableRow}>
									<td className={styles.tableCell}>
										<div className="dateCell">{formatDateTime(log.createdAt)}</div>
									</td>
									<td className={styles.tableCell}>{renderAdminLink(log)}</td>
									<td className={styles.tableCell}>{renderBookingDepartmentLink(log)}</td>
									<td className={styles.tableCell}>{getResultBlock(log)}</td>
								</tr>
							);
						})
					) : (
						<tr>
							<td colSpan={4} className={styles.emptyCell}>
								Логи не найдены
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
