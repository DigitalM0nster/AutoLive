import styles from "./styles.module.scss";
import Pagination from "@/components/ui/pagination/Pagination";
import Loading from "@/components/ui/loading/Loading";
import DataError from "@/components/ui/dataError/DataError";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { UserLog, DepartmentLogResponse, DepartmentLog, ActiveFilter, User } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { useState, useEffect, useCallback, useRef } from "react";

type DepartmentLogsComponentProps = {
	departmentId?: number; // Опциональный параметр для фильтрации логов по конкретному пользователю
};

export default function DepartmentLogsComponent({ departmentId }: DepartmentLogsComponentProps) {
	const [logs, setLogs] = useState<DepartmentLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [actionFilter, setActionFilter] = useState<string | null>(null);
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});
	// Изменяем структуру: теперь храним Map с ID пользователя как ключом и полными данными как значением
	const [existingUsers, setExistingUsers] = useState<Map<number, User>>(new Map());
	// Добавляем состояние для существующих отделов
	const [existingDepartments, setExistingDepartments] = useState<Set<number>>(new Set());
	// Добавляем состояние для актуальных данных отделов
	const [departmentsData, setDepartmentsData] = useState<Map<number, { id: number; name: string }>>(new Map());

	const [clearingLogs, setClearingLogs] = useState(false);

	// Состояния для фильтрации по дате
	const [showDateFilter, setShowDateFilter] = useState(false);
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [isDateFiltered, setIsDateFiltered] = useState(false);

	const { user } = useAuthStore();

	// Функция для загрузки актуальных данных отделов
	const loadDepartmentsData = async () => {
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
	};

	// Отдельный useEffect для загрузки данных при изменении поиска
	useEffect(() => {
		const fetchLogs = async () => {
			// Проверяем, что departmentId передан
			if (!departmentId) {
				setError("ID отдела не указан");
				setLoading(false);
				return;
			}

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

				// Добавляем параметры фильтрации по дате
				if (startDate && startDate.trim() !== "") {
					params.append("startDate", startDate);
				}

				if (endDate && endDate.trim() !== "") {
					params.append("endDate", endDate);
				}

				const response = await fetch(`/api/departments/${departmentId}/logs?${params.toString()}`);

				if (!response.ok) {
					throw new Error("Не удалось загрузить логи отдела");
				}

				const data: DepartmentLogResponse = await response.json();

				if (data.error) {
					throw new Error(data.error);
				}

				setLogs(data.data || []);
				setTotalPages(data.totalPages || 1);
				setTotalCount(data.total || 0);

				// ВАЖНО: Собираем ВСЕ ID пользователей из логов для проверки существования
				// Это нужно для правильного отображения статуса "удален" или "существует"
				// Раньше проверяли только admin пользователей, что приводило к ошибкам
				const allUserIds = new Set<number>();

				// Добавляем admin пользователей (кто выполнял действия)
				(data.data || []).forEach((log: DepartmentLog) => {
					if (log.admin?.id) {
						allUserIds.add(log.admin.id);
					}
				});

				// Добавляем пользователей из snapshotBefore (состояние ДО изменений)
				(data.data || []).forEach((log: DepartmentLog) => {
					if (log.snapshotBefore?.users) {
						log.snapshotBefore.users.forEach((user: any) => {
							if (user.id) {
								allUserIds.add(user.id);
							}
						});
					}
				});

				// Добавляем пользователей из snapshotAfter (состояние ПОСЛЕ изменений)
				(data.data || []).forEach((log: DepartmentLog) => {
					if (log.snapshotAfter?.users) {
						log.snapshotAfter.users.forEach((user: any) => {
							if (user.id) {
								allUserIds.add(user.id);
							}
						});
					}
				});

				// Проверяем существование всех пользователей одним запросом к API
				await checkUsersExistence(Array.from(allUserIds));

				// Проверяем существование отделов из логов
				const departmentIdsToCheck = (data.data || [])
					.flatMap((log: DepartmentLog) => {
						const ids: (number | undefined)[] = [log.targetDepartment?.id, log.snapshotBefore?.id, log.snapshotAfter?.id];

						// Добавляем отделы из addedUsers (currentDepartment)
						if (log.snapshotAfter?.addedUsers) {
							log.snapshotAfter.addedUsers.forEach((addedUser: any) => {
								if (addedUser.currentDepartment?.id) {
									ids.push(addedUser.currentDepartment.id);
								}
								if (addedUser.previousDepartment?.id) {
									ids.push(addedUser.previousDepartment.id);
								}
							});
						}

						// Добавляем отделы из removedUsers (previousDepartment)
						if (log.snapshotAfter?.removedUsers) {
							log.snapshotAfter.removedUsers.forEach((removedUser: any) => {
								if (removedUser.previousDepartment?.id) {
									ids.push(removedUser.previousDepartment.id);
								}
							});
						}

						return ids;
					})
					.filter((id: number | undefined) => id !== undefined) as number[];

				await checkDepartmentsExistence(departmentIdsToCheck);
			} catch (err) {
				console.error("Ошибка при загрузке логов:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			} finally {
				setLoading(false);
			}
		};

		fetchLogs();
	}, [page, actionFilter, departmentId, startDate, endDate]); // Убрали поиск из зависимостей

	// Загружаем данные отделов при монтировании компонента и при изменении фильтров
	useEffect(() => {
		loadDepartmentsData();
	}, [page, actionFilter, startDate, endDate]);

	// Функция для проверки существования пользователей
	// Эта функция отправляет запрос к API для проверки, какие пользователи из списка ID существуют в базе данных
	// API возвращает объект с полными данными пользователей, который мы сохраняем в состоянии existingUsers
	const checkUsersExistence = async (userIds: number[]) => {
		if (userIds.length === 0) return;

		try {
			// Отправляем POST запрос к API с массивом ID пользователей для проверки
			const response = await fetch(`/api/users/check-existence`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userIds }),
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				// Теперь API возвращает объект с полными данными пользователей
				const usersData = data.existingUsers || {};
				// Создаем Map из полученных данных
				const usersMap = new Map(Object.entries(usersData).map(([id, userData]) => [parseInt(id), userData as User]));
				// Сохраняем Map существующих пользователей для быстрой проверки и получения данных
				setExistingUsers(usersMap);
			} else {
				console.error("Ошибка API при проверке существования пользователей:", response.status, response.statusText);
				// Не показываем ошибку пользователю, просто логируем
			}
		} catch (error) {
			console.error("Ошибка при проверке существования пользователей:", error);
			// Не показываем ошибку пользователю, просто логируем
		}
	};

	// Функция для проверки существования отделов
	const checkDepartmentsExistence = async (departmentIds: number[]) => {
		if (departmentIds.length === 0) return;

		try {
			const response = await fetch(`/api/departments/check-existence`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ departmentIds }),
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				const existingIds = data.existingDepartmentIds || [];
				console.log("existingIds", existingIds);
				setExistingDepartments(new Set(existingIds));

				// Также загружаем актуальные данные существующих отделов
				if (existingIds.length > 0) {
					await loadDepartmentsData();
				}
			} else {
				console.error("Ошибка API при проверке существования отделов:", response.status, response.statusText);
				// Не показываем ошибку пользователю, просто логируем
			}
		} catch (error) {
			console.error("Ошибка при проверке существования отделов:", error);
			// Не показываем ошибку пользователю, просто логируем
		}
	};

	// Функция для отображения отдела пользователя (для admin и targetUser)
	const renderUserDepartmentInfo = (department: { id?: number; name: string } | null | undefined) => {
		if (!department) return "Без отдела";

		// Для отделов пользователей показываем название из снапшота
		const snapshotName = department.name;

		// Если у отдела есть id, проверяем существование
		if (department.id) {
			const departmentExists = existingDepartments.has(department.id);

			if (departmentExists) {
				// Получаем актуальное название отдела
				const actualDepartment = departmentsData.get(department.id);
				const actualName = actualDepartment ? actualDepartment.name : snapshotName;

				if (snapshotName === actualName) {
					// Если названия совпадают, показываем только актуальное название со ссылкой
					return (
						<span>
							<a href={`/admin/departments/${department.id}`} className="departmentLink">
								{actualName}
							</a>
						</span>
					);
				} else {
					// Если названия разные, показываем название из снапшота и актуальное название в скобочках со ссылкой
					return (
						<span>
							{snapshotName}{" "}
							<a href={`/admin/departments/${department.id}`} className="departmentLink">
								({actualName})
							</a>
						</span>
					);
				}
			} else {
				// Если отдела не существует, показываем пометку
				return (
					<span>
						{snapshotName} <span className="deletedDepartmentIndicator">(отдел удалён)</span>
					</span>
				);
			}
		} else {
			// Если нет id, просто показываем название
			return snapshotName;
		}
	};

	// Функция для отображения исторической информации об отделах (для логов переводов)
	const renderHistoricalDepartmentInfo = (department: { id?: number; name: string } | null | undefined) => {
		if (!department) return "Без отдела";

		// Название на момент записи лога
		const snapshotName = department.name;

		// Если у отдела есть id, проверяем существование
		if (department.id) {
			const departmentExists = existingDepartments.has(department.id);

			if (departmentExists) {
				// Получаем актуальное название отдела
				const actualDepartment = departmentsData.get(department.id);
				const actualName = actualDepartment ? actualDepartment.name : snapshotName;

				if (snapshotName === actualName) {
					// Если названия совпадают, показываем название со ссылкой
					return (
						<span>
							<a href={`/admin/departments/${department.id}`} className="departmentLink">
								{snapshotName}
							</a>
						</span>
					);
				} else {
					// Если названия разные, показываем историческое название и актуальное в скобочках со ссылкой
					return (
						<span>
							<span className="oldName">{snapshotName}</span>
							<a href={`/admin/departments/${department.id}`} className="departmentLink">
								({actualName})
							</a>
						</span>
					);
				}
			} else {
				// Если отдела не существует, показываем историческое название с пометкой
				return (
					<span>
						{snapshotName} <span className="deletedDepartmentIndicator">(отдел удалён)</span>
					</span>
				);
			}
		} else {
			// Если нет id, просто показываем название
			return snapshotName;
		}
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

	// Функция для отображения отдела с проверкой существования
	const renderDepartmentInfo = (department: { id?: number; name: string } | null | undefined) => {
		if (!department) return "Без отдела";

		// Если у отдела нет id, просто показываем название
		if (!department.id) {
			return department.name;
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
					<span>
						<a href={`/admin/departments/${department.id}`} className="departmentLink">
							{actualName}
						</a>
					</span>
				);
			} else {
				// Если названия разные, показываем название из снапшота и актуальное название в скобочках со ссылкой
				return (
					<span>
						{snapshotName}{" "}
						<a href={`/admin/departments/${department.id}`} className="departmentLink">
							({actualName})
						</a>
					</span>
				);
			}
		} else {
			// Если отдела не существует, показываем пометку с названием из снапшота
			return (
				<span>
					{snapshotName} <span className="deletedDepartmentIndicator">(отдел удалён)</span>
				</span>
			);
		}
	};

	// Функция для переключения активного состояния блока
	const toggleActiveBlock = useCallback((logId: number | string) => {
		setActiveBlocks((prev) => ({
			...prev,
			[logId]: !prev[logId],
		}));
	}, []);

	// Функция для отображения имени пользователя
	const getUserName = (user: { first_name: string | null; last_name: string | null; middle_name?: string | null }) => {
		if (!user) return "—";
		return `${user.last_name || ""} ${user.first_name || ""} ${user.middle_name || ""}`.trim() || "—";
	};

	// Функция для отображения ссылки на пользователя
	// Эта функция показывает информацию о пользователе и проверяет его существование в базе данных
	// Если пользователь не найден (userExists === false), показываем пометку "удален"
	// Если пользователь найден (userExists === true), показываем ссылку на профиль
	const renderUserLink = (
		user: { id: number; first_name?: string | null; last_name?: string | null; middle_name?: string | null; phone?: string; role?: string; department?: any },
		logId: number,
		log?: DepartmentLog,
		actionType?: "add" | "remove"
	) => {
		if (!user || !user.id) return <span className="noUserData">—</span>;

		// Проверяем существование пользователя
		const userExists = existingUsers.has(user.id);
		// Получаем актуальные данные пользователя из existingUsers
		const actualUser = existingUsers.get(user.id);
		const userLogKey = `user_${logId}_${user.id}`;

		// Получаем отдел пользователя (если это не суперадмин)
		const userDepartment = user.role !== "superadmin" ? user.department : null;

		// Пытаемся получить информацию об отделах ДО и ПОСЛЕ из лога
		let departmentUserInfo = null;
		if (log && actionType) {
			if (actionType === "add" && log.snapshotAfter?.addedUsers) {
				departmentUserInfo = log.snapshotAfter.addedUsers.find((addedUser: any) => addedUser.user.id === user.id || addedUser.user.phone === user.phone);
			} else if (actionType === "remove" && log.snapshotAfter?.removedUsers) {
				departmentUserInfo = log.snapshotAfter.removedUsers.find((ru: any) => ru.user.id === user.id || ru.user.phone === user.phone);
			}
		}

		return (
			<div key={userLogKey} className={`fullInfoBlock`}>
				<div className={`clickInfoBlock ${activeBlocks[userLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(userLogKey)}>
					{getUserName({ first_name: user.first_name || null, last_name: user.last_name || null, middle_name: user.middle_name || null })}
					{/* Показываем пометку "удален" только если пользователь точно не существует */}
					{userExists === false && <span className="deletedUserIndicator"> (удален)</span>}
				</div>
				<div className={`openingBlock ${activeBlocks[userLogKey] ? "active" : ""}`}>
					<div className="infoField">
						<span className="title">ID:</span>
						<span className="value">{user.id}</span>
					</div>
					<div className="infoField">
						<span className="title">Телефон:</span>
						<span className="value">{user.phone || "—"}</span>
					</div>
					<div className="infoField">
						<span className="title">Роль:</span>
						<span className="value">{getRoleName(user.role || "")}</span>
					</div>

					{/* Показываем информацию об отделах ДО и ПОСЛЕ если есть данные из лога */}
					{departmentUserInfo ? (
						<>
							{actionType === "add" && (
								<>
									{/* Для добавленных сотрудников: ВСЕГДА показываем отдел ДО */}
									<div className="infoField">
										<span className="title">Переведён из отдела:</span>
										<span className="value">{renderHistoricalDepartmentInfo(departmentUserInfo.previousDepartment)}</span>
									</div>
								</>
							)}
							{actionType === "remove" && (
								<>
									{/* Для удаленных сотрудников: ВСЕГДА показываем отдел ДО */}
									<div className="infoField">
										<span className="title">Переведён в отдел:</span>
										<span className="value">{renderHistoricalDepartmentInfo(departmentUserInfo.previousDepartment)}</span>
									</div>
									{/* Отдел ПОСЛЕ НЕ показываем - пользователя больше нет в отделе */}
								</>
							)}
						</>
					) : (
						/* Если нет информации из лога, показываем текущий отдел */
						userDepartment && (
							<div className="infoField">
								<span className="title">Отдел:</span>
								<span className="value">{renderUserDepartmentInfo(userDepartment)}</span>
							</div>
						)
					)}

					{/* Показываем ссылку на профиль только если пользователь точно существует */}
					{userExists === true && (
						<div className="infoField">
							<span className="title">Профиль:</span>
							<span className="value">
								<a href={`/admin/users/${user.id}`} className="userLink">
									{actualUser?.first_name || ""} {actualUser?.last_name || ""} {actualUser?.middle_name || ""}
								</a>
							</span>
						</div>
					)}
				</div>
			</div>
		);
	};

	// Функция для получения блока с результатами
	const getResultBlock = (log: DepartmentLog): React.ReactNode => {
		console.log(log);
		// Создаем массив блоков для каждого действия
		const actionBlocks: React.ReactNode[] = [];

		// 1. Обработка изменения названия отдела
		if (log.actions.includes("change_name")) {
			const nameChangeKey = `name_change_${log.id}`;
			actionBlocks.push(
				<div key="name_change" className={`tableListItem fullInfoBlock update_name`}>
					<div className={`clickInfoBlock ${activeBlocks[nameChangeKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(nameChangeKey)}>
						Изменение названия
					</div>
					<div className={`openingBlock ${activeBlocks[nameChangeKey] ? "active" : ""}`}>
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
									<tr>
										<td>Название</td>
										<td className="oldValue">{log.snapshotBefore?.name || "Не указано"}</td>
										<td className="newValue">{log.snapshotAfter?.name || "Не указано"}</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			);
		}

		// 2. Обработка изменения категорий отдела
		if (log.actions.includes("change_categories")) {
			const categoriesChangeKey = `categories_change_${log.id}`;
			actionBlocks.push(
				<div key="categories_change" className={`tableListItem fullInfoBlock update_categories`}>
					<div className={`clickInfoBlock ${activeBlocks[categoriesChangeKey] ? "active" : ""} update`} onClick={() => toggleActiveBlock(categoriesChangeKey)}>
						Изменение категорий
					</div>
					<div className={`openingBlock ${activeBlocks[categoriesChangeKey] ? "active" : ""}`}>
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
										<td>Разрешенные категории</td>
										<td className="oldValue">
											<div className="categoriesList">
												{log.snapshotBefore?.allowedCategories && log.snapshotBefore.allowedCategories.length > 0
													? log.snapshotBefore.allowedCategories.map((cat: any) => {
															return (
																<span key={`log_${log.id}_category_${cat.id}`} className="category old">
																	{cat.category?.title || cat.categoryId}
																</span>
															);
													  })
													: "Не указаны"}
											</div>
										</td>
										<td className="newValue">
											<div className="categoriesList">
												{log.snapshotAfter?.allowedCategories && log.snapshotAfter.allowedCategories.length > 0
													? log.snapshotAfter.allowedCategories.map((cat: any) => {
															return (
																<span key={`log_${log.id}_category_${cat.id}`} className="category">
																	{cat.category?.title || cat.categoryId}
																</span>
															);
													  })
													: "Не указаны"}
											</div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			);
		}

		// 3. Обработка добавления сотрудников
		if (log.actions.includes("add_employees")) {
			const addEmployeesKey = `add_employees_${log.id}`;

			// Находим добавленных сотрудников (есть в snapshotAfter, но нет в snapshotBefore)
			const addedUsers = log.snapshotAfter?.addedUsers || [];
			if (addedUsers.length > 0) {
				actionBlocks.push(
					<div key="add_employees" className={`tableListItem fullInfoBlock add_users`}>
						<div className={`clickInfoBlock ${activeBlocks[`${addEmployeesKey}`] ? "active" : ""}`} onClick={() => toggleActiveBlock(addEmployeesKey)}>
							Показать добавленных сотрудников
						</div>
						<div className={`openingBlock ${activeBlocks[addEmployeesKey] ? "active" : ""}`}>
							<div className="tableListItems">
								{addedUsers.map((user: any) => (
									<div key={`added_user_${log.id}_${user.id}`}>{renderUserLink(user.user, log.id, log, "add")}</div>
								))}
							</div>
						</div>
					</div>
				);
			}
		}

		// 4. Обработка удаления сотрудников
		if (log.actions.includes("remove_employees")) {
			const removeEmployeesKey = `remove_employees_${log.id}`;

			// Находим удаленных сотрудников (есть в snapshotBefore, но нет в snapshotAfter)
			const removedUsers = log.snapshotBefore?.users?.filter((beforeUser: any) => !log.snapshotAfter?.users?.some((afterUser: any) => afterUser.id === beforeUser.id)) || [];

			if (removedUsers.length > 0) {
				actionBlocks.push(
					<div key="remove_employees" className={`tableListItem fullInfoBlock remove_users`}>
						<div className={`clickInfoBlock ${activeBlocks[removeEmployeesKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(removeEmployeesKey)}>
							Показать удаленных сотрудников
						</div>
						<div className={`openingBlock ${activeBlocks[removeEmployeesKey] ? "active" : ""}`}>
							<div className="tableListItems">
								{removedUsers.map((user: any) => (
									<div key={`removed_user_${log.id}_${user.id}`}>{renderUserLink(user, log.id, log, "remove")}</div>
								))}
							</div>
						</div>
					</div>
				);
			}
		}

		// 5. Обработка создания отдела (оставляем как есть)
		if (log.actions.includes("create_department")) {
			const createLogKey = `create_${log.id}`;
			actionBlocks.push(
				<div key="create_department" className="tableListItem fullInfoBlock create_department">
					<div className={`clickInfoBlock ${activeBlocks[`${createLogKey}_main`] ? "active" : ""}`} onClick={() => toggleActiveBlock(`${createLogKey}_main`)}>
						Создание отдела
					</div>
					<div className={`openingBlock ${activeBlocks[`${createLogKey}_main`] ? "active" : ""}`}>
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock`}>
								<div className={`clickInfoBlock ${activeBlocks[createLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(createLogKey)}>
									Данные отдела
								</div>
								<div className={`openingBlock ${activeBlocks[createLogKey] ? "active" : ""}`}>
									{log.snapshotAfter && (
										<>
											<div className="infoField">
												<span className="title">ID:</span>
												<span className="value">{log.snapshotAfter.id || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Название:</span>
												<span className="value">{log.snapshotAfter.name || "—"}</span>
											</div>
										</>
									)}
								</div>
							</div>
							{log.snapshotAfter.users.length > 0 && (
								<div className={`tableListItem fullInfoBlock`}>
									<div
										className={`clickInfoBlock ${activeBlocks[`${createLogKey}_users`] ? "active" : ""}`}
										onClick={() => toggleActiveBlock(`${createLogKey}_users`)}
									>
										Добавленные сотрудники
									</div>
									<div className={`openingBlock ${activeBlocks[`${createLogKey}_users`] ? "active" : ""}`}>
										{log.snapshotAfter.users.map((user: any) => {
											return <div key={`user_${log.id}_${user.id}`}>{renderUserLink(user, log.id, log, "add")}</div>;
										})}
									</div>
								</div>
							)}
							{log.snapshotAfter.allowedCategories.length > 0 && (
								<div className={`tableListItem fullInfoBlock`}>
									<div
										className={`clickInfoBlock ${activeBlocks[`${createLogKey}_categories`] ? "active" : ""}`}
										onClick={() => toggleActiveBlock(`${createLogKey}_categories`)}
									>
										Выбранные категории
									</div>
									<div className={`openingBlock ${activeBlocks[`${createLogKey}_categories`] ? "active" : ""}`}>
										<div className="categoriesList">
											{log.snapshotAfter.allowedCategories.map((category: any, index: number) => {
												return (
													<div key={`category_${index}`} className="category">
														{category.category?.title || category.categoryId}
													</div>
												);
											})}
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			);
		}

		// 6. Обработка удаления отдела (оставляем как есть)
		if (log.actions.includes("delete_department")) {
			const deleteLogKey = `remove_${log.id}`;
			actionBlocks.push(
				<div key="delete_department" className={`tableListItem fullInfoBlock delete_department`}>
					<div className={`clickInfoBlock ${activeBlocks[deleteLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(deleteLogKey)}>
						Показать детали
					</div>
					<div className={`openingBlock ${activeBlocks[deleteLogKey] ? "active" : ""}`}>
						{log.snapshotBefore && (
							<>
								<div className="infoField">
									<span className="title">ID:</span>
									<span className="value">{log.snapshotBefore.id || "—"}</span>
								</div>
								<div className="infoField">
									<span className="title">Название:</span>
									<span className="value">{log.snapshotBefore.name || "—"}</span>
								</div>
								<div className="infoField">
									<span className="title">Разрешенные категории:</span>
									<span className="value">
										{log.snapshotBefore.allowedCategories && log.snapshotBefore.allowedCategories.length > 0
											? log.snapshotBefore.allowedCategories.map((cat: any) => cat.category?.title || cat.categoryId).join(", ")
											: "Не указаны"}
									</span>
								</div>
								{/* Показываем пользователей с полной информацией об отделах */}
								{log.snapshotBefore.users && log.snapshotBefore.users.length > 0 && (
									<div className="infoField">
										<span className="title">Пользователи:</span>
										<span className="value">
											<div className="tableListItems">
												{log.snapshotBefore.users.map((user: any) => (
													<div key={`deleted_user_${log.id}_${user.id}`}>{renderUserLink(user, log.id, log, "remove")}</div>
												))}
											</div>
										</span>
									</div>
								)}
							</>
						)}
					</div>
				</div>
			);
		}

		// Возвращаем все блоки действий
		return actionBlocks.length > 0 ? actionBlocks : null;
	};

	// Функция для форматирования даты
	const formatDate = (dateString: string) => {
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
	};

	// Функция для форматирования даты из строки YYYY-MM-DD в DD.MM.YYYY
	const formatDateFromString = (dateString: string): string => {
		if (!dateString) return "";

		const date = new Date(dateString);
		if (isNaN(date.getTime())) return "";

		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear();

		return `${day}.${month}.${year}`;
	};

	// Функция для получения описания действия по строке
	const getActionDescriptionByString = (action: string): string => {
		switch (action) {
			case "create_department":
				return "Создание отдела";
			case "change_name":
				return "Изменение названия отдела";
			case "change_categories":
				return "Изменение категорий отдела";
			case "add_employees":
				return "Добавление пользователей в отдел";
			case "remove_employees":
				return "Удаление пользователей из отдела";
			case "delete_department":
				return "Удаление отдела";
			default:
				return "Действие с отделом";
		}
	};
	// Функция для создания массива активных фильтров
	const getActiveFilters = (): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];

		if (actionFilter) {
			filters.push({
				key: "action",
				label: "Тип действия",
				value: getActionDescriptionByString(actionFilter),
			});
		}

		if (isDateFiltered) {
			filters.push({
				key: "date",
				label: "Дата",
				value: `${startDate ? formatDateFromString(startDate) : "дд.мм.гггг"} — ${endDate ? formatDateFromString(endDate) : "дд.мм.гггг"}`,
			});
		}

		return filters;
	};

	// Обработчик изменения диапазона дат
	const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
		setStartDate(startDate);
		setEndDate(endDate);
		// Устанавливаем флаг фильтрации если есть хотя бы одна дата
		setIsDateFiltered(!!(startDate?.trim() || endDate?.trim()));
		// Сбрасываем на первую страницу при изменении фильтра
		setPage(1);
	}, []);

	// Функция для сброса всех фильтров
	const resetAllFilters = () => {
		setActionFilter(null);
		setStartDate("");
		setEndDate("");
		setIsDateFiltered(false);
		setPage(1);
	};

	// Функция для отображения ссылки на пользователя

	if (loading) {
		return (
			<>
				<div className={`tableContent`}>
					<Loading />
				</div>
			</>
		);
	}

	if (error) {
		return <DataError message={error} />;
	}

	return (
		<div className={`tableContent`}>
			{/* Используем переиспользуемый блок фильтров */}
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetAllFilters} />

			<div className={`tableContent`}>
				<table className={styles.table}>
					<thead className={styles.tableHeader}>
						<tr>
							<th className={styles.tableHeaderCell}>
								<div className="dateFilterHeader">
									Дата
									<div className="dateFilter" onClick={() => setShowDateFilter(!showDateFilter)}>
										{startDate ? formatDateFromString(startDate) : "дд.мм.гггг"} — {endDate ? formatDateFromString(endDate) : "дд.мм.гггг"}
									</div>
									<DateRangePicker isOpen={showDateFilter} onClose={() => setShowDateFilter(false)} onDateRangeChange={handleDateRangeChange} />
								</div>
							</th>
							<th className={styles.tableHeaderCell}>Кем выполнено</th>
							<th className={styles.tableHeaderCell}>
								<CustomSelect
									options={[
										{ value: "all", label: "Все действия" },
										{ value: "create_department", label: "Создание отдела" },
										{ value: "change_name", label: "Изменение названия" },
										{ value: "change_categories", label: "Изменение категорий" },
										{ value: "add_employees", label: "Добавление пользователей" },
										{ value: "remove_employees", label: "Удаление пользователей" },
										{ value: "delete_department", label: "Удаление отдела" },
									]}
									value={actionFilter || "all"}
									onChange={(value) => {
										setActionFilter(value === "all" ? null : value);
										setPage(1); // Сбрасываем страницу при изменении фильтра
									}}
									placeholder="Выберите действие"
									className={styles.actionSelect}
								/>
							</th>
						</tr>
					</thead>
					<tbody className={styles.tableBody}>
						{logs.length > 0 ? (
							logs.map((log) => {
								return (
									<tr key={log.id} className={styles.tableRow}>
										<td className={styles.tableCell}>{formatDate(log.createdAt)}</td>
										<td className={styles.tableCell}>{log.admin ? renderUserLink(log.admin, log.id, log) : "—"}</td>
										<td className={`${styles.tableCell} tableListBlock`}>{getResultBlock(log)}</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td colSpan={3} className={styles.emptyCell}>
									Логи не найдены
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Пагинация */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.logsPagination} />

			{/* Информация о количестве записей */}
			{totalCount > 0 && (
				<div className={styles.logsInfo}>
					Показано {logs.length} из {totalCount} записей
				</div>
			)}
		</div>
	);
}
