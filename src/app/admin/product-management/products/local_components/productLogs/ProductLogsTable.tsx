// Используем стандартные классы из globals.scss
import { useCallback, useEffect, useState } from "react";
import { ProductLog, ProductLogResponse, User } from "@/lib/types";
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
		setLoading(true);
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
		} finally {
			setLoading(false);
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
				.flatMap((log: ProductLog) => [log.admin?.department?.id, log.snapshotBefore?.department?.id, log.snapshotAfter?.department?.id])
				.filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

			await checkDepartmentsExistence(departmentIdsToCheck);
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

	// Функция для отображения отдела
	const renderDepartment = useCallback(
		(department: any) => {
			if (!department) return "—";

			// Проверяем, существует ли отдел в базе данных
			const departmentExists = existingDepartments.has(department.id);
			// Получаем актуальные данные отдела из departmentsData
			const actualDepartment = departmentsData.get(department.id);

			if (departmentExists && actualDepartment) {
				// Если отдел существует, показываем актуальное название
				return actualDepartment.name;
			} else {
				// Если отдела не существует, показываем название из снапшота
				return department.name || "—";
			}
		},
		[existingDepartments, departmentsData]
	);

	// Функция для переключения активного состояния блока
	const toggleActiveBlock = useCallback((logId: number | string) => {
		setActiveBlocks((prev) => ({
			...prev,
			[logId]: !prev[logId],
		}));
	}, []);

	// Функция для отображения ссылки на пользователя с разворачивающимся блоком
	const renderUserLink = useCallback(
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
						{log.snapshotBefore && (
							<div className="infoField">
								<span className="title">До изменения:</span>
								<span className="value">
									<pre>{JSON.stringify(log.snapshotBefore, null, 2)}</pre>
								</span>
							</div>
						)}
						{log.snapshotAfter && (
							<div className="infoField">
								<span className="title">После изменения:</span>
								<span className="value">
									<pre>{JSON.stringify(log.snapshotAfter, null, 2)}</pre>
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
							console.log(log);
							return (
								<tr key={log.id}>
									<td>
										<div className="date">{formatDate(log.createdAt)}</div>
									</td>
									<td>{log.admin ? renderUserLink(log, log.admin, log.id, "admin") : "—"}</td>
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
