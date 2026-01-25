"use client";

import styles from "../../../departments/local_components/styles.module.scss";
import { useCallback, useEffect, useState, useMemo } from "react";
import { BookingLog, BookingLogResponse, User, AdminSnapshotForBookingLog, BookingSnapshotForLog, ManagerSnapshotForBookingLog, BookingDepartmentSnapshotForLog, BookingStatus } from "@/lib/types";
import Loading from "@/components/ui/loading/Loading";
import { useRouter } from "next/navigation";
import React from "react";

export default function AllBookingsLogsTable({
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
	const [localLogs, setLocalLogs] = useState<BookingLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const router = useRouter();

	// Храним данные для проверки существования
	const [existingUsers, setExistingUsers] = useState<Map<number, User>>(new Map());
	const [existingBookings, setExistingBookings] = useState<Set<number>>(new Set());
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
			userIds.forEach((id) => params.append("userIds", id.toString()));

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

	// Функция для проверки существования записей
	const checkBookingsExistence = useCallback(async (bookingIds: number[]) => {
		if (bookingIds.length === 0) return;

		try {
			// Проверяем существование записей через API
			const existingIds: number[] = [];
			await Promise.all(
				bookingIds.map(async (id) => {
					try {
						const response = await fetch(`/api/bookings/${id}`, {
							credentials: "include",
						});
						if (response.ok) {
							existingIds.push(id);
						}
					} catch (error) {
						// Игнорируем ошибки для отдельных записей
					}
				})
			);
			setExistingBookings((prev) => new Set([...prev, ...existingIds]));
		} catch (error) {
			console.error("Ошибка при проверке существования записей:", error);
		}
	}, []);

	// Функция для проверки существования отделов записей
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
						// Игнорируем ошибки для отдельных отделов
					}
				})
			);
			setExistingBookingDepartments((prev) => new Set([...prev, ...existingIds]));
		} catch (error) {
			console.error("Ошибка при проверке существования отделов записей:", error);
		}
	}, []);

	// Функция для загрузки данных отделов записей
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
			console.error("Ошибка при загрузке данных отделов записей:", error);
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

	// Функция для отображения статуса записи
	const getStatusText = useCallback((status: BookingStatus | string) => {
		switch (status) {
			case "scheduled":
				return "Запланирована";
			case "confirmed":
				return "Подтверждена";
			case "completed":
				return "Выполнена";
			case "cancelled":
				return "Отменена";
			case "no_show":
				return "Не явился";
			default:
				return status;
		}
	}, []);

	// Функция для форматирования даты
	const formatDate = useCallback((dateString: string | Date) => {
		if (!dateString) return "—";

		const date = typeof dateString === "string" ? new Date(dateString) : dateString;
		if (isNaN(date.getTime())) return "—";

		return new Intl.DateTimeFormat("ru", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}).format(date);
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
		(log: BookingLog) => {
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

	// Функция для отображения ссылки на запись
	const renderBookingLink = useCallback(
		(log: BookingLog) => {
			if (!log.bookingSnapshot) {
				return `Запись #${log.bookingId}`;
			}

			const booking = log.bookingSnapshot;
			const bookingLogKey = `booking_${log.id}`;
			const bookingExists = existingBookings.has(booking.id);
			const scheduledDate = typeof booking.scheduledDate === "string" ? new Date(booking.scheduledDate) : booking.scheduledDate;
			const dateStr = formatDate(scheduledDate);

			return (
				<div className={`fullInfoBlock`}>
					<div className={`clickInfoBlock ${activeBlocks[bookingLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(bookingLogKey)}>
						Запись #{booking.id}
					</div>
					<div className={`openingBlock ${activeBlocks[bookingLogKey] ? "active" : ""}`}>
						<div className="infoField">
							<span className="title">ID:</span>
							<span className="value">{booking.id}</span>
						</div>
						<div className="infoField">
							<span className="title">Дата:</span>
							<span className="value">{dateStr}</span>
						</div>
						<div className="infoField">
							<span className="title">Время:</span>
							<span className="value">{booking.scheduledTime || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Статус:</span>
							<span className="value">{getStatusText(booking.status)}</span>
						</div>
						{bookingExists && (
							<div className="infoField">
								<span className="title">Просмотр:</span>
								<span className="value">
									<a href={`/admin/bookings/${booking.id}`} className="itemLink">
										Открыть запись
									</a>
								</span>
							</div>
						)}
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, formatDate, getStatusText, existingBookings]
	);

	// Функция для получения предыдущего снапшота записи (для сравнения изменений)
	const getPreviousBookingSnapshot = useCallback(
		(log: BookingLog, allLogs: BookingLog[]): BookingSnapshotForLog | null => {
			// Находим индекс текущего лога
			const currentIndex = allLogs.findIndex((l) => l.id === log.id);
			if (currentIndex === -1) return null;

			// Ищем предыдущий лог для той же записи
			for (let i = currentIndex - 1; i >= 0; i--) {
				const prevLog = allLogs[i];
				if (prevLog.bookingId === log.bookingId && prevLog.bookingSnapshot) {
					return prevLog.bookingSnapshot;
				}
			}

			return null;
		},
		[]
	);

	// Функция для получения предыдущего снапшота отдела (для получения адреса)
	const getPreviousDepartmentSnapshot = useCallback(
		(log: BookingLog, allLogs: BookingLog[]): BookingDepartmentSnapshotForLog | null => {
			// Находим индекс текущего лога
			const currentIndex = allLogs.findIndex((l) => l.id === log.id);
			if (currentIndex === -1) return null;

			// Ищем предыдущий лог для той же записи
			for (let i = currentIndex - 1; i >= 0; i--) {
				const prevLog = allLogs[i];
				if (prevLog.bookingId === log.bookingId && prevLog.departmentSnapshot) {
					return prevLog.departmentSnapshot;
				}
			}

			return null;
		},
		[]
	);

	// Функция для сравнения значений (с учетом дат)
	const compareValues = useCallback((before: any, after: any): boolean => {
		if (before === after) return true;
		if (before === null || before === undefined) return after === null || after === undefined;
		if (after === null || after === undefined) return false;

		// Для дат сравниваем ISO строки
		if (before instanceof Date && after instanceof Date) {
			return before.toISOString() === after.toISOString();
		}
		if (typeof before === "string" && typeof after === "string") {
			// Проверяем, являются ли строки датами
			const beforeDate = new Date(before);
			const afterDate = new Date(after);
			if (!isNaN(beforeDate.getTime()) && !isNaN(afterDate.getTime())) {
				return beforeDate.toISOString() === afterDate.toISOString();
			}
			return before === after;
		}

		return String(before) === String(after);
	}, []);

	// Функция для форматирования значения для отображения
	const formatValue = useCallback((value: any, fieldName: string): string => {
		if (value === null || value === undefined) return "—";

		if (fieldName === "scheduledDate") {
			return formatDate(typeof value === "string" ? new Date(value) : value);
		}

		if (fieldName === "status") {
			return getStatusText(value);
		}

		return String(value);
	}, [formatDate, getStatusText]);

	// Функция для получения блока с результатами
	const getResultBlock = useCallback(
		(log: BookingLog, allLogs?: BookingLog[]): React.ReactNode => {
			const action = log.action;
			const resultLogKey = `result_${log.id}`;

			if (action === "create") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock create`}>
								<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
									Создание записи
								</div>
								<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
									{log.bookingSnapshot && (
										<div className="tableListItems">
											<div className="tableListItem fullInfoBlock">
												<div className="infoField">
													<span className="title">ID:</span>
													<span className="value">{log.bookingSnapshot.id}</span>
												</div>
												<div className="infoField">
													<span className="title">Дата:</span>
													<span className="value">
														{formatDate(typeof log.bookingSnapshot.scheduledDate === "string" ? new Date(log.bookingSnapshot.scheduledDate) : log.bookingSnapshot.scheduledDate)}
													</span>
												</div>
												<div className="infoField">
													<span className="title">Время:</span>
													<span className="value">{log.bookingSnapshot.scheduledTime || "—"}</span>
												</div>
												<div className="infoField">
													<span className="title">Статус:</span>
													<span className="value">{getStatusText(log.bookingSnapshot.status)}</span>
												</div>
												{log.departmentSnapshot && (
													<div className="infoField">
														<span className="title">Отдел:</span>
														<span className="value">{log.departmentSnapshot.name || log.departmentSnapshot.address}</span>
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
				const after = log.bookingSnapshot;
				const before = allLogs ? getPreviousBookingSnapshot(log, allLogs) : null;
				const afterDepartmentSnapshot = log.departmentSnapshot;
				const beforeDepartmentSnapshot = allLogs ? getPreviousDepartmentSnapshot(log, allLogs) : null;

				// Список полей для проверки изменений
				const fieldsToCheck: Array<{ key: keyof BookingSnapshotForLog; label: string }> = [
					{ key: "scheduledDate", label: "Дата записи" },
					{ key: "scheduledTime", label: "Время записи" },
					{ key: "contactPhone", label: "Телефон для связи" },
					{ key: "status", label: "Статус" },
					{ key: "bookingDepartmentId", label: "Адрес" },
					{ key: "clientId", label: "Клиент" },
					{ key: "managerId", label: "Менеджер" },
					{ key: "notes", label: "Примечания" },
				];

				// Собираем измененные поля
				const changedFields: Array<{ key: string; label: string; before: any; after: any; isAddress?: boolean }> = [];

				if (after) {
					fieldsToCheck.forEach(({ key, label }) => {
						const beforeValue = before?.[key];
						const afterValue = after[key];

						// Для адреса используем address из departmentSnapshot вместо ID
						if (key === "bookingDepartmentId") {
							const beforeAddress = beforeDepartmentSnapshot?.address || "—";
							const afterAddress = afterDepartmentSnapshot?.address || "—";

							// Проверяем изменение по ID, но сохраняем адреса
							if (!compareValues(beforeValue, afterValue)) {
								changedFields.push({
									key: key as string,
									label,
									before: beforeAddress,
									after: afterAddress,
									isAddress: true,
								});
							}
						} else {
							if (!compareValues(beforeValue, afterValue)) {
								changedFields.push({
									key: key as string,
									label,
									before: beforeValue,
									after: afterValue,
								});
							}
						}
					});
				}

				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock update`}>
								<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
									Редактирование записи
								</div>
								<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
									{after && (
										<div className="changesTable">
											{changedFields.length > 0 ? (
												<table>
													<thead>
														<tr>
															<th>Поле</th>
															<th>Было</th>
															<th>Стало</th>
														</tr>
													</thead>
													<tbody>
														{changedFields.map((field, index) => (
															<tr key={index}>
																<td>{field.label}</td>
																<td className="oldValue">{formatValue(field.before, field.key)}</td>
																<td className="newValue">{formatValue(field.after, field.key)}</td>
															</tr>
														))}
													</tbody>
												</table>
											) : (
												<div className="infoField">
													<span className="title">Изменения:</span>
													<span className="value">{log.message || "Нет изменений"}</span>
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

			if (action === "status_change") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock update`}>
								<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
									Изменение статуса
								</div>
								<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
									{log.bookingSnapshot && (
										<div className="tableListItems">
											<div className="tableListItem fullInfoBlock">
												<div className="infoField">
													<span className="title">ID:</span>
													<span className="value">{log.bookingSnapshot.id}</span>
												</div>
												<div className="infoField">
													<span className="title">Новый статус:</span>
													<span className="value">{getStatusText(log.bookingSnapshot.status)}</span>
												</div>
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

			if (action === "assign" || action === "unassign") {
				const isAssign = action === "assign";
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock ${isAssign ? "create" : "remove"}`}>
								<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
									{isAssign ? "Назначение менеджера" : "Снятие назначения менеджера"}
								</div>
								<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
									{log.bookingSnapshot && (
										<div className="tableListItems">
											<div className="tableListItem fullInfoBlock">
												<div className="infoField">
													<span className="title">ID записи:</span>
													<span className="value">{log.bookingSnapshot.id}</span>
												</div>
												{log.managerSnapshot && (
													<>
														<div className="infoField">
															<span className="title">Менеджер:</span>
															<span className="value">{getUserName({ first_name: log.managerSnapshot.first_name, last_name: log.managerSnapshot.last_name })}</span>
														</div>
														<div className="infoField">
															<span className="title">Роль:</span>
															<span className="value">{getRoleName(log.managerSnapshot.role)}</span>
														</div>
													</>
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

			if (action === "cancel") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock remove`}>
								<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
									Отмена записи
								</div>
								<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
									{log.bookingSnapshot && (
										<div className="tableListItems">
											<div className="tableListItem fullInfoBlock">
												<div className="infoField">
													<span className="title">ID:</span>
													<span className="value">{log.bookingSnapshot.id}</span>
												</div>
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
		[activeBlocks, toggleActiveBlock, formatDate, getStatusText, getUserName, getRoleName, getPreviousBookingSnapshot, getPreviousDepartmentSnapshot, compareValues, formatValue]
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
				const response = await fetch(`/api/bookings/logs?${queryParams.toString()}`, {
					credentials: "include",
				});

				if (!response.ok) {
					throw new Error("Не удалось загрузить логи записей");
				}

				const data: BookingLogResponse = await response.json();

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
					.flatMap((log: BookingLog) => {
						const userIds: number[] = [];
						if (log.adminSnapshot?.id) userIds.push(log.adminSnapshot.id);
						if (log.managerSnapshot?.id) userIds.push(log.managerSnapshot.id);
						return userIds;
					})
					.filter((id: number) => id !== undefined && id !== 0)
					.filter((id: number, index: number, array: number[]) => array.indexOf(id) === index) as number[];

				await checkUsersExistence(userIdsToCheck);

				// Проверяем существование записей
				const bookingIdsToCheck = (data.data || [])
					.map((log: BookingLog) => log.bookingId)
					.filter((id: number) => id !== undefined && id !== 0) as number[];

				await checkBookingsExistence(bookingIdsToCheck);

				// Проверяем существование отделов записей
				const departmentIdsToCheck = (data.data || [])
					.flatMap((log: BookingLog) => [log.departmentSnapshot?.id, log.bookingSnapshot?.bookingDepartmentId])
					.filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

				await checkBookingDepartmentsExistence(departmentIdsToCheck);
			} catch (err) {
				console.error("Ошибка при загрузке логов:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			} finally {
				setLoading(false);
			}
		};

		fetchLogs();
	}, [queryParams, checkUsersExistence, checkBookingsExistence, checkBookingDepartmentsExistence, onLogsUpdate]);

	// Загружаем данные отделов записей при монтировании компонента
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
						filteredLogs.map((log: BookingLog) => {
							return (
								<tr key={log.id} className={styles.tableRow}>
									<td className={styles.tableCell}>
										<div className="dateCell">{formatDate(log.createdAt)}</div>
									</td>
									<td className={styles.tableCell}>{renderAdminLink(log)}</td>
									<td className={styles.tableCell}>{renderBookingLink(log)}</td>
									<td className={styles.tableCell}>{getResultBlock(log, filteredLogs)}</td>
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