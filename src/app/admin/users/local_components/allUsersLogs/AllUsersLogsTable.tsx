"use client";

import styles from "../styles.module.scss";
import { useCallback, useEffect, useState } from "react";
import { UserLog, UserLogResponse, User } from "@/lib/types";
import Loading from "@/components/ui/loading/Loading";

export default function AllUsersLogsTable({
	logs,
	tableHeaders,
	queryParams,
	onLogsUpdate,
}: {
	logs: any;
	tableHeaders: any;
	queryParams: any;
	onLogsUpdate?: (totalCount: number, totalPages: number) => void;
}) {
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [localLogs, setLocalLogs] = useState<UserLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	// Изменяем структуру: теперь храним Map с ID пользователя как ключом и полными данными как значением
	const [existingUsers, setExistingUsers] = useState<Map<number, User>>(new Map());
	const [existingDepartments, setExistingDepartments] = useState<Set<number>>(new Set());
	const [departmentsData, setDepartmentsData] = useState<Map<number, { id: number; name: string }>>(new Map());

	// Функция для проверки существования пользователей
	const checkUsersExistence = useCallback(async (userIds: number[]) => {
		if (userIds.length === 0) return;

		try {
			// Используем GET запрос с параметрами в URL вместо POST
			const params = new URLSearchParams();
			userIds.forEach((id) => params.append("userIds", id.toString()));

			const response = await fetch(`/api/users/check-existence?${params.toString()}`, {
				method: "GET",
				credentials: "include",
				// Убираем headers и body - они не нужны для GET запроса
			});

			if (response.ok) {
				const data = await response.json();
				// Теперь API возвращает объект с полными данными пользователей
				const usersData = data.existingUsers || {};
				// Создаем Map из полученных данных
				const usersMap = new Map(Object.entries(usersData).map(([id, userData]) => [parseInt(id), userData as User]));
				setExistingUsers(usersMap);
			} else {
				console.error("Ошибка API при проверке существования пользователей:", response.status, response.statusText);
			}
		} catch (error) {
			console.error("Ошибка при проверке существования пользователей:", error);
		}
	}, []);

	// Функция для проверки существования отделов
	const checkDepartmentsExistence = useCallback(async (departmentIds: number[]) => {
		if (departmentIds.length === 0) return;

		try {
			// Используем GET запрос с параметрами в URL вместо POST
			const params = new URLSearchParams();
			departmentIds.forEach((id) => params.append("departmentIds", id.toString()));

			const response = await fetch(`/api/departments/check-existence?${params.toString()}`, {
				method: "GET",
				credentials: "include",
				// Убираем headers и body - они не нужны для GET запроса
			});

			if (response.ok) {
				const data = await response.json();
				const existingIds = data.existingDepartmentIds || [];
				setExistingDepartments(new Set(existingIds));
			} else {
				console.error("Ошибка API при проверке существования отделов:", response.status, response.statusText);
			}
		} catch (error) {
			console.error("Ошибка при проверке существования отделов:", error);
		}
	}, []);

	// Функция для загрузки актуальных данных отделов
	const loadDepartmentsData = useCallback(async () => {
		try {
			const response = await fetch(`/api/departments`, {
				credentials: "include",
			});

			if (response.ok) {
				const departments = await response.json();
				const departmentsMap = new Map<number, { id: number; name: string }>(departments.map((dept: { id: number; name: string }) => [dept.id, dept]));
				setDepartmentsData(departmentsMap);
			} else {
				console.error("Ошибка при загрузке данных отделов:", response.status, response.statusText);
			}
		} catch (error) {
			console.error("Ошибка при загрузке данных отделов:", error);
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

	// Функция для отображения статуса пользователя
	const getStatusName = useCallback((status: string) => {
		switch (status) {
			case "verified":
				return "Подтверждён";
			case "unverified":
				return "Не подтверждён";
			default:
				return status;
		}
	}, []);

	// Функция для отображения отдела с ссылкой, если отдел существует
	const renderDepartment = useCallback(
		(department: any) => {
			if (!department || !department.id) {
				return "Без отдела";
			}

			const departmentExists = existingDepartments.has(department.id);

			// Получаем актуальное название отдела
			const actualDepartment = departmentsData.get(department.id);
			const snapshotName = department.name;
			const actualName = actualDepartment ? actualDepartment.name : snapshotName;

			if (departmentExists) {
				// Если отдел существует
				if (snapshotName === actualName) {
					// Если названия совпадают, показываем только актуальное название ссылкой
					return (
						<a href={`/admin/departments/${department.id}`} className={styles.departmentLink}>
							{actualName}
						</a>
					);
				} else {
					// Если названия разные, показываем название из снапшота и актуальное название в скобочках со ссылкой
					return (
						<span>
							{snapshotName}{" "}
							<a href={`/admin/departments/${department.id}`} className={styles.departmentLink}>
								({actualName})
							</a>
						</span>
					);
				}
			} else {
				// Если отдела не существует, показываем пометку с названием из снапшота
				return (
					<span>
						{snapshotName} <span className={styles.deletedDepartmentIndicator}>(отдел удалён)</span>
					</span>
				);
			}
		},
		[existingDepartments, departmentsData]
	);

	// Функция для форматирования даты
	const formatDate = useCallback((dateString: string) => {
		if (!dateString) return "—";

		const date = new Date(dateString);
		// Проверяем, что дата валидная
		if (isNaN(date.getTime()) || date.getFullYear() === 1970) {
			return "—";
		}

		return new Intl.DateTimeFormat("ru", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}).format(date);
	}, []);

	// Функция для переключения активного состояния блока
	const toggleActiveBlock = useCallback((logId: number | string) => {
		setActiveBlocks((prev) => ({
			...prev,
			[logId]: !prev[logId],
		}));
	}, []);

	// Функция для отображения ссылки на пользователя
	const renderUserLink = useCallback(
		(
			log: UserLog,
			user: { id: number; first_name?: string | null; last_name?: string | null; middle_name?: string | null; phone?: string; role?: string; department?: any },
			logId: number,
			userType: "admin" | "target"
		) => {
			// Проверяем, существует ли пользователь в базе данных
			// Если пользователь не найден в existingUsers, но у него есть ID, значит он удален
			const userExists = existingUsers.has(user.id);
			// Получаем актуальные данные пользователя из existingUsers
			const actualUser = existingUsers.get(user.id);
			const userLogKey = `${userType}_${logId}_${user.id}_${userType === "admin" ? "admin" : "target"}`;

			return (
				<div key={userLogKey} className={`fullInfoBlock`}>
					<div className={`clickInfoBlock ${activeBlocks[userLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(userLogKey)}>
						{getUserName({ first_name: user.first_name || null, last_name: user.last_name || null, middle_name: user.middle_name || null })}
					</div>
					<div className={`openingBlock ${activeBlocks[userLogKey] ? "active" : ""}`}>
						<div className="infoField">
							<span className="title">ID:</span>
							<span className="value">{user.id || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Телефон:</span>
							<span className="value">{user.phone || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Роль:</span>
							<span className="value">{getRoleName(user.role || "")}</span>
						</div>
						<div className="infoField">
							<span className="title">Отдел:</span>
							<span className="value">{renderDepartment(user.department)}</span>
						</div>
						{userExists ? (
							<div className="infoField">
								<span className="title">Профиль:</span>
								<span className="value">
									<a href={`/admin/users/${user.id}`} className="itemLink">
										{actualUser?.first_name || ""} {actualUser?.last_name || ""} {actualUser?.middle_name || ""}
									</a>
								</span>
							</div>
						) : (
							<div className="infoField">
								<span className="title">Статус:</span>
								<span className="value deletedItemStatus">Пользователь удален</span>
							</div>
						)}
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, getUserName, getRoleName, existingUsers, renderDepartment]
	);

	// Функция для получения блока с результатами
	const getResultBlock = useCallback(
		(log: UserLog): React.ReactNode => {
			// Используем только массив actions
			const actions = log.actions;
			const firstAction = actions[0];
			const userExists = existingUsers.has(log.targetUser.id);
			// Получаем актуальные данные пользователя из existingUsers
			const actualUser = existingUsers.get(log.targetUser.id);

			if (actions.includes("create")) {
				const createLogKey = `create_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock create`}>
								<div className={`clickInfoBlock ${activeBlocks[createLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(createLogKey)}>
									Создание пользователя
								</div>
								<div className={`openingBlock ${activeBlocks[createLogKey] ? "active" : ""}`}>
									{log.snapshotAfter && (
										<>
											<div className="infoField">
												<span className="title">Телефон:</span>
												<span className="value">{log.snapshotAfter.phone || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Имя:</span>
												<span className="value">{log.snapshotAfter.first_name || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Фамилия:</span>
												<span className="value">{log.snapshotAfter.last_name || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Отчество:</span>
												<span className="value">{log.snapshotAfter.middle_name || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Роль:</span>
												<span className="value">{getRoleName(log.snapshotAfter.role)}</span>
											</div>
											<div className="infoField">
												<span className="title">Статус:</span>
												<span className="value">{getStatusName(log.snapshotAfter.status)}</span>
											</div>
											<div className="infoField">
												<span className="title">Отдел:</span>
												<span className="value">{renderDepartment(log.snapshotAfter.department)}</span>
											</div>
											{log.snapshotAfter.orders && (
												<>
													<div className="infoField">
														<span className="title">Заявок как клиент:</span>
														<span className="value">{log.snapshotAfter.orders.total_as_client}</span>
													</div>
													<div className="infoField">
														<span className="title">Заявок как менеджер:</span>
														<span className="value">{log.snapshotAfter.orders.total_as_manager}</span>
													</div>
													<div className="infoField">
														<span className="title">Всего заявок:</span>
														<span className="value">{log.snapshotAfter.orders.total_as_client + log.snapshotAfter.orders.total_as_manager}</span>
													</div>
												</>
											)}
										</>
									)}
									{userExists ? (
										<div className="infoField">
											<span className="title">Профиль:</span>
											<span className="value">
												<a href={`/admin/users/${log.targetUser.id}`} className="itemLink">
													{actualUser?.first_name || ""} {actualUser?.last_name || ""} {actualUser?.middle_name || ""}
												</a>
											</span>
										</div>
									) : (
										<div className="infoField">
											<span className="title">Статус:</span>
											<span className="value deletedItemStatus">Пользователь удален</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			} else if (actions.includes("delete")) {
				const deleteLogKey = `delete_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock remove`}>
								<div className={`clickInfoBlock ${activeBlocks[deleteLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(deleteLogKey)}>
									Удаление пользователя
								</div>
								<div className={`openingBlock ${activeBlocks[deleteLogKey] ? "active" : ""}`}>
									{log.snapshotBefore && (
										<>
											<div className="infoField">
												<span className="title">Телефон:</span>
												<span className="value">{log.snapshotBefore.phone || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Имя:</span>
												<span className="value">{log.snapshotBefore.first_name || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Фамилия:</span>
												<span className="value">{log.snapshotBefore.last_name || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Отчество:</span>
												<span className="value">{log.snapshotBefore.middle_name || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Роль:</span>
												<span className="value">{getRoleName(log.snapshotBefore.role)}</span>
											</div>
											<div className="infoField">
												<span className="title">Статус:</span>
												<span className="value">{getStatusName(log.snapshotBefore.status)}</span>
											</div>
											<div className="infoField">
												<span className="title">Отдел:</span>
												<span className="value">{renderDepartment(log.snapshotBefore.department)}</span>
											</div>
											{log.snapshotBefore.orders && (
												<>
													<div className="infoField">
														<span className="title">Заявок как клиент:</span>
														<span className="value">{log.snapshotBefore.orders.total_as_client}</span>
													</div>
													<div className="infoField">
														<span className="title">Заявок как менеджер:</span>
														<span className="value">{log.snapshotBefore.orders.total_as_manager}</span>
													</div>
													<div className="infoField">
														<span className="title">Всего заявок:</span>
														<span className="value">{log.snapshotBefore.orders.total_as_client + log.snapshotBefore.orders.total_as_manager}</span>
													</div>
												</>
											)}
										</>
									)}
									{userExists ? (
										<div className="infoField">
											<span className="title">Профиль:</span>
											<span className="value">
												<a href={`/admin/users/${log.targetUser.id}`} className="itemLink">
													{actualUser?.first_name || ""} {actualUser?.last_name || ""} {actualUser?.middle_name || ""}
												</a>
											</span>
										</div>
									) : (
										<div className="infoField">
											<span className="title">Статус:</span>
											<span className="value deletedItemStatus">Пользователь удален</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			} else if (actions.includes("update")) {
				// Создаем уникальный ключ для блока изменений
				const updateLogKey = `update_${log.id}`;

				// Проверяем, что именно изменилось
				const firstNameChanged = log.snapshotBefore?.first_name !== log.snapshotAfter?.first_name;
				const lastNameChanged = log.snapshotBefore?.last_name !== log.snapshotAfter?.last_name;
				const middleNameChanged = log.snapshotBefore?.middle_name !== log.snapshotAfter?.middle_name;
				const phoneChanged = log.snapshotBefore?.phone !== log.snapshotAfter?.phone;
				const roleChanged = log.snapshotBefore?.role !== log.snapshotAfter?.role;
				const statusChanged = log.snapshotBefore?.status !== log.snapshotAfter?.status;
				const departmentChanged = log.snapshotBefore?.department?.name !== log.snapshotAfter?.department?.name;

				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock update`}>
								<div className={`clickInfoBlock ${activeBlocks[updateLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(updateLogKey)}>
									Редактирование пользователя
								</div>
								<div className={`openingBlock ${activeBlocks[updateLogKey] ? "active" : ""}`}>
									{/* Показываем изменения в виде таблицы */}
									{(firstNameChanged || lastNameChanged || middleNameChanged || phoneChanged || roleChanged || statusChanged || departmentChanged) && (
										<div className="changesTable">
											<table>
												<thead>
													<tr>
														<th>Параметр</th>
														<th>ДО изменений</th>
														<th>ПОСЛЕ изменений</th>
													</tr>
												</thead>
												<tbody>
													{firstNameChanged && (
														<tr>
															<td>Имя</td>
															<td className="oldValue">{log.snapshotBefore?.first_name || "Не указано"}</td>
															<td className="newValue">{log.snapshotAfter?.first_name || "Не указано"}</td>
														</tr>
													)}
													{lastNameChanged && (
														<tr>
															<td>Фамилия</td>
															<td className="oldValue">{log.snapshotBefore?.last_name || "Не указано"}</td>
															<td className="newValue">{log.snapshotAfter?.last_name || "Не указано"}</td>
														</tr>
													)}
													{middleNameChanged && (
														<tr>
															<td>Отчество</td>
															<td className="oldValue">{log.snapshotBefore?.middle_name || "Не указано"}</td>
															<td className="newValue">{log.snapshotAfter?.middle_name || "Не указано"}</td>
														</tr>
													)}
													{phoneChanged && (
														<tr>
															<td>Телефон</td>
															<td className="oldValue">{log.snapshotBefore?.phone || "Не указано"}</td>
															<td className="newValue">{log.snapshotAfter?.phone || "Не указано"}</td>
														</tr>
													)}
													{roleChanged && (
														<tr>
															<td>Роль</td>
															<td className="oldValue">{getRoleName(log.snapshotBefore?.role || "")}</td>
															<td className="newValue">{getRoleName(log.snapshotAfter?.role || "")}</td>
														</tr>
													)}
													{statusChanged && (
														<tr>
															<td>Статус</td>
															<td className="oldValue">{getStatusName(log.snapshotBefore?.status || "")}</td>
															<td className="newValue">{getStatusName(log.snapshotAfter?.status || "")}</td>
														</tr>
													)}
													{departmentChanged && (
														<tr>
															<td>Отдел</td>
															<td className="oldValue">{renderDepartment(log.snapshotBefore?.department)}</td>
															<td className="newValue">{renderDepartment(log.snapshotAfter?.department)}</td>
														</tr>
													)}
												</tbody>
											</table>
											{userExists ? (
												<div className="infoField">
													<span className="title">Профиль:</span>
													<span className="value">
														<a href={`/admin/users/${log.targetUser.id}`} className="itemLink">
															{actualUser?.first_name || ""} {actualUser?.last_name || ""} {actualUser?.middle_name || ""}
														</a>
													</span>
												</div>
											) : (
												<div className="infoField">
													<span className="title">Статус:</span>
													<span className="value deletedItemStatus">Пользователь удален</span>
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
			return null;
		},
		[activeBlocks, toggleActiveBlock, getRoleName, getStatusName, existingUsers, renderDepartment]
	);

	useEffect(() => {
		const fetchLogs = async () => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetch(`/api/users/logs?${queryParams.toString()}`);

				if (!response.ok) {
					throw new Error("Не удалось загрузить логи пользователей");
				}

				const data: UserLogResponse = await response.json();

				if (data.error) {
					throw new Error(data.error);
				}

				setLocalLogs(data.data || []);
				console.log(data.data);
				setTotalPages(data.totalPages || 1);
				setTotalCount(data.total || 0);

				// Уведомляем родительский компонент об обновлении данных
				if (onLogsUpdate) {
					onLogsUpdate(data.total || 0, data.totalPages || 1);
				}

				// Проверяем существование пользователей из логов (и админов, и целевых пользователей)
				const userIdsToCheck = (data.data || [])
					.flatMap((log: UserLog) => [log.admin?.id, log.targetUser?.id])
					.filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

				await checkUsersExistence(userIdsToCheck);

				// Проверяем существование отделов из логов
				const departmentIdsToCheck = (data.data || [])
					.flatMap((log: UserLog) => [log.admin?.department?.id, log.targetUser?.department?.id, log.snapshotBefore?.department?.id, log.snapshotAfter?.department?.id])
					.filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

				await checkDepartmentsExistence(departmentIdsToCheck);
			} catch (err) {
				console.error("Ошибка при загрузке логов:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			} finally {
				setLoading(false);
			}
		};

		fetchLogs();
	}, [queryParams, checkUsersExistence, checkDepartmentsExistence, onLogsUpdate]);

	// Загружаем данные отделов при монтировании компонента
	useEffect(() => {
		loadDepartmentsData();
	}, [loadDepartmentsData]);

	return (
		<div className={`tableContent`}>
			<table className={styles.table}>
				<thead className={styles.tableHeader}>{tableHeaders}</thead>
				<tbody className={styles.tableBody}>
					{loading ? (
						<tr>
							<td>
								<Loading />
							</td>
						</tr>
					) : localLogs.length > 0 ? (
						localLogs.map((log: UserLog) => {
							// console.log(log);
							return (
								<tr key={log.id} className={styles.tableRow}>
									<td className={styles.tableCell}>{formatDate(log.createdAt)}</td>
									<td className={styles.tableCell}>{log.admin ? renderUserLink(log, log.admin, log.id, "admin") : "—"}</td>
									<td className={styles.tableCell}>{log.targetUser ? renderUserLink(log, log.targetUser, log.id, "target") : "—"}</td>

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
