"use client";

import styles from "./styles.module.scss";
import { useCallback, useEffect, useState } from "react";
import { DepartmentLog, DepartmentLogResponse, User } from "@/lib/types";
import Loading from "@/components/ui/loading/Loading";

export default function AllDepartmentsLogsTable({
	tableHeaders,
	queryParams,
	onLogsUpdate,
}: {
	tableHeaders: any;
	queryParams: any;
	onLogsUpdate?: (totalCount: number, totalPages: number) => void;
}) {
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [localLogs, setLocalLogs] = useState<DepartmentLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	// Изменяем структуру: теперь храним Map с ID пользователя как ключом и полными данными как значением
	const [existingUsers, setExistingUsers] = useState<Map<number, User>>(new Map());
	const [existingDepartments, setExistingDepartments] = useState<Set<number>>(new Set());
	const [departmentsData, setDepartmentsData] = useState<Map<number, { id: number; name: string }>>(new Map());

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
			// Используем GET запрос с параметрами в URL вместо POST
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

	// Функция для отображения отдела с ссылкой, если отдел существует
	const renderTargetDepartment = useCallback(
		(department: any, log: DepartmentLog) => {
			if (!department || !department.id) {
				return "Без отдела";
			}

			// console.log(log);

			const departmentExists = existingDepartments.has(department.id);
			const departmentLogKey = `log_${log.id}_department_${department.id}`;

			// Получаем актуальное название отдела
			const actualDepartment = departmentsData.get(department.id);
			const snapshotName = log.snapshotBefore?.name || log.snapshotAfter?.name || department.name;
			const actualName = actualDepartment ? actualDepartment.name : snapshotName;

			if (departmentExists) {
				// Если отдел существует
				if (snapshotName === actualName) {
					// Если названия совпадают, показываем только актуальное название ссылкой
					return (
						<div className={`fullInfoBlock`}>
							<div className={`clickInfoBlock ${activeBlocks[departmentLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(departmentLogKey)}>
								{actualName}
							</div>
							<div className={`openingBlock ${activeBlocks[departmentLogKey] ? "active" : ""}`}>
								<div className="infoField">
									<span className="title">ID:</span>
									<span className="value">{department.id}</span>
								</div>
								<div className="infoField">
									<span className="title">Ссылка:</span>
									<span className="value">
										<a href={`/admin/departments/${department.id}`} className="userLink">
											{actualName}
										</a>
									</span>
								</div>
							</div>
						</div>
					);
				} else {
					// Если названия разные, показываем название из снапшота и актуальное название в скобочках со ссылкой
					return (
						<div className={`fullInfoBlock`}>
							<div className={`clickInfoBlock ${activeBlocks[departmentLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(departmentLogKey)}>
								{snapshotName}
							</div>
							<div className={`openingBlock ${activeBlocks[departmentLogKey] ? "active" : ""}`}>
								<div className="infoField">
									<span className="title">ID:</span>
									<span className="value">{department.id}</span>
								</div>
								<div className="infoField">
									<span className="title">Ссылка:</span>
									<span className="value">
										<a href={`/admin/departments/${department.id}`} className="userLink">
											{actualName}
										</a>
									</span>
								</div>
							</div>
						</div>
					);
				}
			} else {
				// Если отдела не существует, показываем пометку с названием из снапшота
				return (
					<div className={`fullInfoBlock`}>
						<div className={`clickInfoBlock ${activeBlocks[departmentLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(departmentLogKey)}>
							{snapshotName}
						</div>
						<div className={`openingBlock ${activeBlocks[departmentLogKey] ? "active" : ""}`}>
							<div className="infoField">
								<span className="title">ID:</span>
								<span className="value">{department.id}</span>
							</div>
							<div className="infoField">
								<span className="title">Ссылка:</span>
								<span className="value">Отдел удалён</span>
							</div>
						</div>
					</div>
				);
			}
		},
		[existingDepartments, departmentsData, activeBlocks]
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

	// Функция для отображения ссылки на пользователя
	const renderUserLink = useCallback(
		(
			log: DepartmentLog,
			user: { id: number; first_name?: string | null; last_name?: string | null; middle_name?: string | null; phone?: string; role?: string; department?: any },
			logId: number,
			userType: string
		) => {
			// Проверяем, существует ли пользователь в базе данных
			// Если пользователь не найден в existingUsers, но у него есть ID, значит он удален
			const userExists = existingUsers.has(user.id);
			// Получаем актуальные данные пользователя из existingUsers
			const actualUser = existingUsers.get(user.id);
			const userLogKey = `${userType}_${logId}_${user.id}`;

			return (
				<div key={userLogKey} className={`fullInfoBlock`}>
					<div
						className={`clickInfoBlock ${activeBlocks[userLogKey] ? "active" : ""} ${userType === "removed" ? "removedUser" : ""} ${
							userType === "added" ? "addedUser" : ""
						}`}
						onClick={() => toggleActiveBlock(userLogKey)}
					>
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
								<span className="title maxContent">Профиль:</span>
								<span className="value">
									<a href={`/admin/users/${user.id}`} className="userLink">
										{actualUser?.last_name || ""} {actualUser?.first_name || ""} {actualUser?.middle_name || ""}
									</a>
								</span>
							</div>
						) : (
							<div className="infoField">
								<span className="title">Статус:</span>
								<span className="value deletedUserStatus">Пользователь удален</span>
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
		(log: DepartmentLog): React.ReactNode => {
			// Используем только массив actions
			const actions = log.actions;
			const firstAction = actions[0];
			const departmentExists = existingDepartments.has(log.targetDepartment.id);

			if (actions.includes("create_department")) {
				const createLogKey = `create_department_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock create`}>
								<div className={`clickInfoBlock ${activeBlocks[createLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(createLogKey)}>
									Создание отдела
								</div>
								<div className={`openingBlock ${activeBlocks[createLogKey] ? "active" : ""}`}>
									{log.snapshotAfter && (
										<div className="tableListItems">
											<div className="tableListItem fullInfoBlock">
												<div
													className={`clickInfoBlock ${activeBlocks[`${createLogKey}_name`] ? "active" : ""}`}
													onClick={() => toggleActiveBlock(`${createLogKey}_name`)}
												>
													Общая информация
												</div>
												<div className={`openingBlock ${activeBlocks[`${createLogKey}_name`] ? "active" : ""}`}>
													<div className="infoField">
														<span className="title">ID:</span>
														<span className="value">{log.snapshotAfter.id}</span>
													</div>
													<div className="infoField">
														<span className="title">Название:</span>
														<span className="value">{log.snapshotAfter.name}</span>
													</div>
												</div>
											</div>
											<div className="tableListItem fullInfoBlock">
												<div
													className={`clickInfoBlock ${activeBlocks[`${createLogKey}_categories`] ? "active" : ""}`}
													onClick={() => toggleActiveBlock(`${createLogKey}_categories`)}
												>
													Выбранные категории
												</div>
												<div className={`openingBlock ${activeBlocks[`${createLogKey}_categories`] ? "active" : ""}`}>
													<div className="categoriesList">
														{log.snapshotAfter.allowedCategories.map((category: any) => (
															<span key={`log_${log.id}_category_${category.id}`} className="category">
																{category.category.title}
															</span>
														))}
													</div>
												</div>
											</div>
											<div className="tableListItem fullInfoBlock">
												<div
													className={`clickInfoBlock ${activeBlocks[`${createLogKey}_users`] ? "active" : ""}`}
													onClick={() => toggleActiveBlock(`${createLogKey}_users`)}
												>
													Добавленные сотрудники
												</div>
												<div className={`openingBlock ${activeBlocks[`${createLogKey}_users`] ? "active" : ""}`}>
													<div className="tableListItems">
														{log.snapshotAfter.users.map((user: any) => {
															return renderUserLink(log, user, log.id, "target");
														})}
													</div>
												</div>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (actions.includes("delete_department")) {
				console.log(log);
				const deleteLogKey = `delete_department_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock remove`}>
								<div className={`clickInfoBlock ${activeBlocks[deleteLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(deleteLogKey)}>
									Удаление отдела
								</div>
								<div className={`openingBlock ${activeBlocks[deleteLogKey] ? "active" : ""}`}>
									{log.snapshotBefore && (
										<div className="tableListItems">
											<div className="tableListItem">
												<div className="infoField">
													<span className="title">ID:</span>
													<span className="value">{log.snapshotBefore.id}</span>
												</div>
												<div className="infoField">
													<span className="title">Название:</span>
													<span className="value">{log.snapshotBefore.name}</span>
												</div>
											</div>
											<div className="tableListItems">
												{log.snapshotAfter?.removedUsers?.map((removedUser: any) => {
													return renderUserLink(log, removedUser.user, log.id, "removed");
												}) ||
													log.snapshotBefore?.users?.map((user: any) => {
														return renderUserLink(log, user, log.id, "removed");
													}) ||
													[]}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (actions.includes("add_employees") || actions.includes("remove_employees") || actions.includes("change_name") || actions.includes("change_categories")) {
				const updateLogKey = `update_department_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock update`}>
								<div className={`clickInfoBlock ${activeBlocks[updateLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(updateLogKey)}>
									Редактирование отдела
								</div>
								<div className={`openingBlock ${activeBlocks[updateLogKey] ? "active" : ""}`}>
									<div className="tableListItems">
										{actions.includes("change_name") && (
											<div className="tableListItem fullInfoBlock">
												<div
													className={`clickInfoBlock ${activeBlocks[`${updateLogKey}_name`] ? "active" : ""}`}
													onClick={() => toggleActiveBlock(`${updateLogKey}_name`)}
												>
													Изменение названия отдела
												</div>
												<div className={`openingBlock ${activeBlocks[`${updateLogKey}_name`] ? "active" : ""}`}>
													<div className="changesTable">
														<table>
															<thead>
																<tr>
																	<th>Параметр</th>
																	<th>Было</th>
																	<th>Стало</th>
																</tr>
															</thead>
															<tbody>
																<tr>
																	<td>Имя</td>
																	<td className="oldValue">{log.snapshotBefore?.name || "Не указано"}</td>
																	<td className="newValue">{log.snapshotAfter?.name || "Не указано"}</td>
																</tr>
															</tbody>
														</table>
													</div>
												</div>
											</div>
										)}
										{actions.includes("change_categories") && (
											<div className="tableListItem fullInfoBlock">
												<div
													className={`clickInfoBlock ${activeBlocks[`${updateLogKey}_categories`] ? "active" : ""}`}
													onClick={() => toggleActiveBlock(`${updateLogKey}_categories`)}
												>
													Изменение категорий отдела
												</div>
												<div className={`openingBlock ${activeBlocks[`${updateLogKey}_categories`] ? "active" : ""}`}>
													<div className="changesTable">
														<table>
															<thead>
																<tr>
																	<th>Параметр</th>
																	<th>Было</th>
																	<th>Стало</th>
																</tr>
															</thead>
															<tbody>
																<tr>
																	<td>Имя</td>
																	<td className="oldValue">
																		<div className="categoriesList">
																			{log.snapshotBefore?.allowedCategories.map((category: any) => (
																				<span key={`log_${log.id}_category_${category.id}`} className="category">
																					{category.category.title}
																				</span>
																			))}
																		</div>
																	</td>
																	<td className="newValue">
																		{" "}
																		<div className="categoriesList">
																			{log.snapshotAfter?.allowedCategories.map((category: any) => (
																				<span key={`log_${log.id}_category_${category.id}`} className="category">
																					{category.category.title}
																				</span>
																			))}
																		</div>
																	</td>
																</tr>
															</tbody>
														</table>
													</div>
												</div>
											</div>
										)}
										{actions.includes("add_employees") && (
											<div className="tableListItem fullInfoBlock">
												<div
													className={`clickInfoBlock ${activeBlocks[`${updateLogKey}_users`] ? "active" : ""} addedUser`}
													onClick={() => toggleActiveBlock(`${updateLogKey}_users`)}
												>
													Добавленные сотрудники
												</div>
												<div className={`openingBlock ${activeBlocks[`${updateLogKey}_users`] ? "active" : ""}`}>
													<div className="tableListItems">
														{log.snapshotAfter.addedUsers.map((user: any) => {
															return renderUserLink(log, user.user, log.id, "added");
														})}
													</div>
												</div>
											</div>
										)}
										{actions.includes("remove_employees") && (
											<div className="tableListItem fullInfoBlock">
												<div
													className={`clickInfoBlock removedUser ${activeBlocks[`${updateLogKey}_users`] ? "active" : ""}`}
													onClick={() => toggleActiveBlock(`${updateLogKey}_users`)}
												>
													Удалённые сотрудники
												</div>
												<div className={`openingBlock ${activeBlocks[`${updateLogKey}_users`] ? "active" : ""}`}>
													<div className="tableListItems">
														{log.snapshotAfter.removedUsers.map((removedUser: any) => {
															return renderUserLink(log, removedUser.user, log.id, "removed");
														})}
													</div>
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				);
			}

			// Если действие не определено, показываем общую информацию
			return (
				<div className="tableListBlock">
					<div className="tableListItems">
						<div className={`tableListItem fullInfoBlock`}>
							<div className="clickInfoBlock">{actions.length > 0 ? actions.join(", ") : "Неизвестное действие"}</div>
						</div>
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, getRoleName, getStatusName, existingDepartments]
	);

	useEffect(() => {
		const fetchLogs = async () => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetch(`/api/departments/logs?${queryParams.toString()}`);

				if (!response.ok) {
					throw new Error("Не удалось загрузить логи отделов");
				}

				const data: DepartmentLogResponse = await response.json();

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

				// Проверяем существование пользователей из логов (админы, пользователи отделов, снапшоты)
				const userIdsToCheck = (data.data || [])
					.flatMap((log: DepartmentLog) => {
						const userIds: number[] = [];

						// ID администратора
						if (log.admin?.id) {
							userIds.push(log.admin.id);
						}

						// ID администратора в снапшоте
						if (log.adminSnapshot?.id) {
							userIds.push(log.adminSnapshot.id);
						}

						// Пользователи целевого отдела
						if (log.targetDepartment?.users) {
							userIds.push(...log.targetDepartment.users.map((user: { id: number }) => user.id));
						}

						// Пользователи в снапшоте "до"
						if (log.snapshotBefore?.users) {
							userIds.push(...log.snapshotBefore.users.map((user: { id: number }) => user.id));
						}

						// Пользователи в снапшоте "после"
						if (log.snapshotAfter?.users) {
							userIds.push(...log.snapshotAfter.users.map((user: { id: number }) => user.id));
						}

						return userIds;
					})
					.filter((id: number) => id !== undefined && id !== 0)
					// Удаляем дублирующиеся ID пользователей
					.filter((id: number, index: number, array: number[]) => array.indexOf(id) === index) as number[];
				await checkUsersExistence(userIdsToCheck);

				// Проверяем существование отделов из логов
				const departmentIdsToCheck = (data.data || [])
					.flatMap((log: DepartmentLog) => [log.admin?.department?.id, log.targetDepartment?.id, log.snapshotBefore?.department?.id, log.snapshotAfter?.department?.id])
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
						localLogs.map((log: DepartmentLog) => {
							return (
								<tr key={log.id} className={styles.tableRow}>
									<td className={styles.tableCell}>
										<div className="dateCell">{formatDate(log.createdAt)}</div>
									</td>
									<td className={styles.tableCell}>{log.admin ? renderUserLink(log, log.admin, log.id, "admin") : "—"}</td>
									<td className={styles.tableCell}>{renderTargetDepartment(log.targetDepartment, log)}</td>

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
