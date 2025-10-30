// Используем стандартные классы из globals.scss
import { useCallback, useEffect, useState } from "react";
import { ProductLog, ProductLogResponse, User, DepartmentForLog } from "@/lib/types";
import Loading from "@/components/ui/loading/Loading";

export default function ProductLogsTable({
	productId,
	tableHeaders,
	queryParams,
	onLogsUpdate,
}: {
	productId: number | undefined;
	tableHeaders: any;
	queryParams: any;
	onLogsUpdate?: (totalPages: number) => void;
}) {
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [localLogs, setLocalLogs] = useState<ProductLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	// Изменяем структуру: теперь храним Map с ID пользователя как ключом и полными данными как значением
	const [existingUsers, setExistingUsers] = useState<Map<number, User>>(new Map());
	const [existingDepartments, setExistingDepartments] = useState<Set<number>>(new Set());
	const [departmentsData, setDepartmentsData] = useState<Map<number, DepartmentForLog>>(new Map());
	// Храним данные категорий
	const [existingCategories, setExistingCategories] = useState<Set<number>>(new Set());
	const [categoriesData, setCategoriesData] = useState<Map<number, { id: number; title: string }>>(new Map());

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
		console.log("🔍 checkDepartmentsExistence called with:", departmentIds);
		if (departmentIds.length === 0) {
			console.log("🔍 checkDepartmentsExistence - no department IDs, returning");
			return;
		}

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
				console.log("🔍 checkDepartmentsExistence API response:", { departmentIds, existingIds, data });
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
		console.log("🔍 loadDepartmentsData called");
		setLoading(true);
		try {
			const response = await fetch(`/api/departments`, {
				credentials: "include",
			});

			if (response.ok) {
				const departments = await response.json();
				const departmentsMap = new Map<number, DepartmentForLog>(departments.map((dept: DepartmentForLog) => [dept.id, dept]));
				console.log("🔍 loadDepartmentsData response:", { departments, departmentsMapKeys: Array.from(departmentsMap.keys()) });
				setDepartmentsData(departmentsMap);
			} else {
				console.error("Ошибка при загрузке данных отделов:", response.status, response.statusText);
			}
		} catch (error) {
			console.error("Ошибка при загрузке данных отделов:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	// Функция для загрузки актуальных данных категорий
	const loadCategoriesData = useCallback(async () => {
		try {
			const response = await fetch(`/api/categories`, {
				credentials: "include",
			});

			if (response.ok) {
				const categories = await response.json();
				const categoriesMap = new Map<number, { id: number; title: string }>(categories.map((cat: { id: number; title: string }) => [cat.id, cat]));
				setCategoriesData(categoriesMap);
			} else {
				console.error("Ошибка при загрузке данных категорий:", response.status, response.statusText);
			}
		} catch (error) {
			console.error("Ошибка при загрузке данных категорий:", error);
		}
	}, []);

	const fetchLogs = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/products/${productId}/logs?${queryParams.toString()}`);

			if (!response.ok) {
				throw new Error("Не удалось загрузить логи товара");
			}

			const data: ProductLogResponse = await response.json();

			if (data.error) {
				throw new Error(data.error);
			}

			setLocalLogs(data.data || []);
			console.log(data.data);
			setTotalPages(data.totalPages || 1);

			// Уведомляем родительский компонент об обновлении данных
			if (onLogsUpdate) {
				onLogsUpdate(data.totalPages || 1);
			}

			// Проверяем существование пользователей из логов (админов)
			const userIdsToCheck = (data.data || []).flatMap((log: ProductLog) => [log.admin?.id]).filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

			await checkUsersExistence(userIdsToCheck);

			// Проверяем существование отделов из логов
			const departmentIdsToCheck = (data.data || [])
				.flatMap((log: ProductLog) => [log.admin?.department?.id, log.departmentSnapshot?.id, log.snapshotBefore?.department?.id, log.snapshotAfter?.department?.id])
				.filter((id: number | undefined | null) => id !== undefined && id !== null && id !== 0) as number[];

			console.log("🔍 fetchLogs - departmentIdsToCheck:", departmentIdsToCheck);
			await checkDepartmentsExistence(departmentIdsToCheck);
			console.log("🔍 fetchLogs - after checkDepartmentsExistence, existingDepartments:", Array.from(existingDepartments));
			console.log("🔍 fetchLogs - departmentsData keys:", Array.from(departmentsData.keys()));
		} catch (err) {
			console.error("Ошибка при загрузке логов:", err);
			setError(err instanceof Error ? err.message : "Неизвестная ошибка");
		} finally {
			setLoading(false);
		}
	}, [productId, queryParams, onLogsUpdate, checkUsersExistence, checkDepartmentsExistence]);

	// Функция для отображения имени пользователя
	const renderUserName = useCallback(
		(user: any) => {
			if (!user) return "—";

			// Проверяем, существует ли пользователь в базе данных
			const userExists = existingUsers.has(user.id);
			// Получаем актуальные данные пользователя из existingUsers
			const actualUser = existingUsers.get(user.id);

			if (userExists && actualUser) {
				// Если пользователь существует, показываем актуальные данные
				return `${actualUser.first_name || ""} ${actualUser.last_name || ""} ${actualUser.middle_name || ""}`.trim() || "—";
			} else {
				// Если пользователя не существует, показываем данные из снапшота
				return `${user.first_name || ""} ${user.last_name || ""} ${user.middle_name || ""}`.trim() || "—";
			}
		},
		[existingUsers]
	);

	// Функция для отображения отдела с ссылкой, если отдел существует
	const renderDepartment = useCallback(
		(department: DepartmentForLog | null | undefined, log: ProductLog) => {
			// Используем ID из объекта department
			const targetDepartmentId = department?.id;
			// Отладка только для отдела ПОСЛЕ изменений
			if (department === log.snapshotAfter?.department) {
				console.log("🔍 ОТДЕЛ ПОСЛЕ изменений:", {
					department,
					targetDepartmentId,
					existingDepartments: Array.from(existingDepartments),
					departmentsDataKeys: Array.from(departmentsData.keys()),
					logId: log.id,
					logAction: log.action,
				});
			}

			if (!targetDepartmentId) return "—";

			// Получаем актуальные данные отдела из departmentsData
			const actualDepartment = departmentsData.get(targetDepartmentId);
			const snapshotName = department?.name;
			const actualName = actualDepartment ? actualDepartment.name : snapshotName;

			// Используем departmentsData как основной источник истины для существования
			const departmentExists = actualDepartment !== undefined;

			// Отладка только для отдела ПОСЛЕ изменений
			if (department === log.snapshotAfter?.department) {
				console.log("🔍 ПРОВЕРКА отдела ПОСЛЕ:", {
					targetDepartmentId,
					departmentExists,
					actualDepartment,
					snapshotName,
					actualName,
					willShowDeleted: !departmentExists || !actualDepartment,
				});
			}

			if (departmentExists && actualDepartment) {
				// Если отдел существует
				if (snapshotName === actualName) {
					// Если названия совпадают, показываем только актуальное название ссылкой
					return (
						<a href={`/admin/departments/${targetDepartmentId}`} className="itemLink">
							{actualName}
						</a>
					);
				} else {
					// Если названия разные, показываем название из снапшота и актуальное название в скобочках со ссылкой
					return (
						<span>
							{snapshotName}{" "}
							<a href={`/admin/departments/${targetDepartmentId}`} className="itemLink">
								({actualName})
							</a>
						</span>
					);
				}
			} else {
				console.log(log, departmentExists, actualDepartment);
				// Если отдела не существует, показываем пометку с названием из снапшота
				return (
					<span>
						{snapshotName || `ID: ${targetDepartmentId}`} <span className="deletedItemStatus">(отдел удалён)</span>
					</span>
				);
			}
		},
		[departmentsData]
	);

	// Функция для отображения категории с ссылкой, если категория существует
	const renderCategoryLink = useCallback(
		(category: { id: number; title: string } | null | undefined) => {
			// Определяем ID категории
			const catId = category?.id;

			if (!catId) {
				return "Без категории";
			}

			// Получаем актуальные данные категории из categoriesData
			const actualCategory = categoriesData.get(catId);
			const snapshotName = category?.title || `ID: ${catId}`;
			const actualName = actualCategory ? actualCategory.title : snapshotName;

			// Постоянное решение: используем только categoriesData для проверки существования
			const categoryExists = actualCategory !== undefined;

			if (categoryExists) {
				// Если категория существует
				if (snapshotName === actualName) {
					// Если названия совпадают, показываем только актуальное название ссылкой
					return (
						<a href={`/admin/categories/${catId}`} className="itemLink">
							{actualName}
						</a>
					);
				} else {
					// Если названия разные, показываем название из снапшота и актуальное название в скобочках со ссылкой
					return (
						<span>
							{snapshotName}{" "}
							<a href={`/admin/categories/${catId}`} className="itemLink">
								({actualName})
							</a>
						</span>
					);
				}
			} else {
				// Если категории не существует, показываем пометку с названием из снапшота
				return (
					<span>
						{snapshotName} <span className="deletedItemStatus">(категория удалена)</span>
					</span>
				);
			}
		},
		[categoriesData]
	);

	// Функция для переключения активного состояния блока
	const toggleActiveBlock = useCallback((logId: number | string) => {
		setActiveBlocks((prev) => ({
			...prev,
			[logId]: !prev[logId],
		}));
	}, []);

	// Функция для отображения ссылки на пользователя с разворачивающимся блоком
	const renderUserBlock = useCallback(
		(
			log: ProductLog,
			user: { id: number; first_name?: string | null; last_name?: string | null; middle_name?: string | null; phone?: string; role?: string; department?: any },
			logId: number,
			userType: "admin"
		) => {
			// Проверяем, существует ли пользователь в базе данных
			const userExists = existingUsers.has(user.id);
			// Получаем актуальные данные пользователя из existingUsers
			const actualUser = existingUsers.get(user.id);
			const userLogKey = `${userType}_${logId}_${user.id}`;

			return (
				<div key={userLogKey} className={`fullInfoBlock`}>
					<div className={`clickInfoBlock ${activeBlocks[userLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(userLogKey)}>
						{renderUserName(user)}
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
							<span className="value">{user.role || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Отдел:</span>
							<span className="value">{renderDepartment(user.department, log)}</span>
						</div>
						{userExists ? (
							<div className="infoField">
								<span className="title">Профиль:</span>
								<span className="value">
									<a href={`/admin/users/${user.id}`} className="itemLink">
										{actualUser?.last_name || ""} {actualUser?.first_name || ""} {actualUser?.middle_name || ""}
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
		[activeBlocks, toggleActiveBlock, existingUsers, renderUserName, renderDepartment]
	);

	// Функция для форматирования даты
	const formatDate = useCallback((dateString: string) => {
		if (!dateString) return "—";

		const date = new Date(dateString);

		return new Intl.DateTimeFormat("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}).format(date);
	}, []);

	// Функция для получения блока результата
	const getResultBlock = useCallback(
		(log: ProductLog) => {
			if (!log.snapshotBefore && !log.snapshotAfter) {
				return log.message || "—";
			}

			const resultLogKey = `result_${log.id}`;

			// Проверяем, что именно изменилось
			const titleChanged = log.snapshotBefore?.title !== log.snapshotAfter?.title;
			const skuChanged = log.snapshotBefore?.sku !== log.snapshotAfter?.sku;
			const brandChanged = log.snapshotBefore?.brand !== log.snapshotAfter?.brand;
			const priceChanged = log.snapshotBefore?.price !== log.snapshotAfter?.price;
			const categoryChanged = log.snapshotBefore?.categoryId !== log.snapshotAfter?.categoryId;
			const departmentChanged = log.snapshotBefore?.departmentId !== log.snapshotAfter?.departmentId;
			const descriptionChanged = log.snapshotBefore?.description !== log.snapshotAfter?.description;
			const imageChanged = log.snapshotBefore?.image !== log.snapshotAfter?.image;

			const hasChanges = titleChanged || skuChanged || brandChanged || priceChanged || categoryChanged || departmentChanged || descriptionChanged || imageChanged;

			return (
				<div key={resultLogKey} className={`fullInfoBlock`}>
					<div className={`clickInfoBlock ${activeBlocks[resultLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(resultLogKey)}>
						{log.message || "Показать изменения"}
					</div>
					<div className={`openingBlock ${activeBlocks[resultLogKey] ? "active" : ""}`}>
						{log.importLogId && (
							<div className="infoField">
								<span className="title">Контекст:</span>
								<span className="value">
									<span className="importContext">Изменение при импорте товаров</span>
									<a href={`/admin/product-management/products/import/${log.importLogId}`} className="importLink">
										Перейти к логу импорта
									</a>
								</span>
							</div>
						)}

						{/* Показываем изменения в виде таблицы, если есть изменения */}
						{hasChanges && (
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
										{titleChanged && (
											<tr>
												<td>Название</td>
												<td className="oldValue">{log.snapshotBefore?.title || "Не указано"}</td>
												<td className="newValue">{log.snapshotAfter?.title || "Не указано"}</td>
											</tr>
										)}
										{skuChanged && (
											<tr>
												<td>SKU</td>
												<td className="oldValue">{log.snapshotBefore?.sku || "Не указано"}</td>
												<td className="newValue">{log.snapshotAfter?.sku || "Не указано"}</td>
											</tr>
										)}
										{brandChanged && (
											<tr>
												<td>Бренд</td>
												<td className="oldValue">{log.snapshotBefore?.brand || "Не указано"}</td>
												<td className="newValue">{log.snapshotAfter?.brand || "Не указано"}</td>
											</tr>
										)}
										{priceChanged && (
											<tr>
												<td>Цена</td>
												<td className="oldValue">{log.snapshotBefore?.price || "Не указано"}</td>
												<td className="newValue">{log.snapshotAfter?.price || "Не указано"}</td>
											</tr>
										)}
										{categoryChanged && (
											<tr>
												<td>Категория</td>
												<td className="oldValue">{renderCategoryLink(log.snapshotBefore?.category)}</td>
												<td className="newValue">{renderCategoryLink(log.snapshotAfter?.category)}</td>
											</tr>
										)}
										{departmentChanged && (
											<tr>
												<td>Отдел</td>
												<td className="oldValue">{renderDepartment(log.snapshotBefore?.department, log)}</td>
												<td className="newValue">{renderDepartment(log.snapshotAfter?.department, log)}</td>
											</tr>
										)}
										{descriptionChanged && (
											<tr>
												<td>Описание</td>
												<td className="oldValue">{log.snapshotBefore?.description || "Не указано"}</td>
												<td className="newValue">{log.snapshotAfter?.description || "Не указано"}</td>
											</tr>
										)}
										{imageChanged && (
											<tr>
												<td>Изображение</td>
												<td className="oldValue">
													{log.snapshotBefore?.image ? (
														<a href={log.snapshotBefore.image} target="_blank" rel="noopener noreferrer" className="itemLink">
															Открыть старое изображение
														</a>
													) : (
														"Не указано"
													)}
												</td>
												<td className="newValue">
													{log.snapshotAfter?.image ? (
														<a href={log.snapshotAfter.image} target="_blank" rel="noopener noreferrer" className="itemLink">
															Открыть новое изображение
														</a>
													) : (
														"Удалено"
													)}
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						)}

						{/* Если нет изменений, показываем полные данные */}
						{!hasChanges && log.snapshotAfter && (
							<div className="infoField">
								<span className="title">Данные товара:</span>
								<span className="value">
									<div>Название: {log.snapshotAfter.title || "—"}</div>
									<div>SKU: {log.snapshotAfter.sku || "—"}</div>
									<div>Бренд: {log.snapshotAfter.brand || "—"}</div>
									<div>Цена: {log.snapshotAfter.price || "—"}</div>
									<div>Категория: {renderCategoryLink(log.snapshotAfter.category)}</div>
									<div>Отдел: {log.departmentSnapshot?.name || "—"}</div>
									<div>Описание: {log.snapshotAfter.description || "—"}</div>
									<div>
										Изображение:{" "}
										{log.snapshotAfter.image ? (
											<a href={log.snapshotAfter.image} target="_blank" rel="noopener noreferrer" className="itemLink">
												Открыть изображение
											</a>
										) : (
											"Не указано"
										)}
									</div>
								</span>
							</div>
						)}
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock]
	);

	useEffect(() => {
		loadDepartmentsData();
	}, [loadDepartmentsData]);

	useEffect(() => {
		loadCategoriesData();
	}, [loadCategoriesData]);

	useEffect(() => {
		if (productId) {
			fetchLogs();
		}
	}, [fetchLogs, productId]);

	if (error) {
		return <div>Ошибка: {error}</div>;
	}

	return (
		<div className={`tableContent`}>
			<table>
				<thead>{tableHeaders}</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={3}>
								<Loading />
							</td>
						</tr>
					) : localLogs.length > 0 ? (
						localLogs.map((log) => {
							// console.log(log);
							return (
								<tr key={log.id}>
									<td>
										<div className="date">{formatDate(log.createdAt)}</div>
									</td>
									<td>{log.admin ? renderUserBlock(log, log.admin, log.id, "admin") : "—"}</td>
									<td>{getResultBlock(log)}</td>
								</tr>
							);
						})
					) : (
						<tr>
							<td colSpan={3}>Логи не найдены</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
