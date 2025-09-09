"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductLog, ProductLogResponse, User } from "@/lib/types";
import Loading from "@/components/ui/loading/Loading";
import ImportDetailsComponent from "./ImportDetailsComponent";

export default function AllProductsLogsTable({
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
	const [localLogs, setLocalLogs] = useState<ProductLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	// Храним Map с ID пользователя как ключом и полными данными как значением
	const [existingUsers, setExistingUsers] = useState<Map<number, User>>(new Map());
	const [existingDepartments, setExistingDepartments] = useState<Set<number>>(new Set());
	const [departmentsData, setDepartmentsData] = useState<Map<number, { id: number; name: string }>>(new Map());
	// Храним Map с ID товара как ключом и полными данными как значением
	const [existingProducts, setExistingProducts] = useState<Map<number, any>>(new Map());
	// Состояние для отображения деталей импорта
	const [showImportDetails, setShowImportDetails] = useState<number | null>(null);
	// Состояние для детальных данных импорта
	const [importDetailsData, setImportDetailsData] = useState<Map<number, any>>(new Map());

	// Функция для загрузки детальных данных импорта
	const loadImportDetails = useCallback(async (importLogId: number) => {
		try {
			const response = await fetch(`/api/products/import-logs/${importLogId}/products?page=1&limit=100`);
			if (response.ok) {
				const data = await response.json();
				setImportDetailsData((prev) => new Map(prev.set(importLogId, data)));
			} else {
				console.error("Ошибка API при загрузке деталей импорта:", response.status, response.statusText);
			}
		} catch (error) {
			console.error("Ошибка при загрузке деталей импорта:", error);
		}
	}, []);

	// Функция для проверки существования пользователей
	const checkUsersExistence = useCallback(async (userIds: number[]) => {
		if (userIds.length === 0) return;

		try {
			// Используем GET запрос с параметрами в URL
			const params = new URLSearchParams();
			userIds.forEach((id) => params.append("userIds", id.toString()));

			const response = await fetch(`/api/users/check-existence?${params.toString()}`, {
				method: "GET",
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				// API возвращает объект с полными данными пользователей
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
			// Используем GET запрос с параметрами в URL
			const params = new URLSearchParams();
			params.set("departmentIds", departmentIds.join(","));
			const url = `/api/departments/check-existence?${params.toString()}`;

			const response = await fetch(url, {
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

	// Функция для проверки существования товаров
	const checkProductsExistence = useCallback(async (productIds: number[]) => {
		if (productIds.length === 0) return;

		try {
			// Используем GET запрос с параметрами в URL
			const params = new URLSearchParams();
			productIds.forEach((id) => params.append("productIds", id.toString()));

			const response = await fetch(`/api/products/check-existence?${params.toString()}`, {
				method: "GET",
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				// API возвращает объект с полными данными товаров
				const productsData = data.existingProducts || {};
				// Создаем Map из полученных данных
				const productsMap = new Map(Object.entries(productsData).map(([id, productData]) => [parseInt(id), productData]));
				setExistingProducts(productsMap);
			} else {
				console.error("Ошибка API при проверке существования товаров:", response.status, response.statusText);
			}
		} catch (error) {
			console.error("Ошибка при проверке существования товаров:", error);
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

	const fetchLogs = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/products/logs?${queryParams.toString()}`);

			if (!response.ok) {
				throw new Error("Не удалось загрузить логи продуктов");
			}

			const data = await response.json();

			if (data.error) {
				throw new Error(data.error);
			}

			// Преобразуем данные из нового API в формат ProductLog
			const formattedLogs: ProductLog[] = (data.data || []).map((log: any) => ({
				id: log.id,
				createdAt: log.createdAt,
				action: log.action || "update",
				message: log.message,
				admin: log.admin
					? {
							id: log.admin.id,
							first_name: log.admin.first_name,
							last_name: log.admin.last_name,
							middle_name: log.admin.middle_name,
							phone: log.admin.phone,
							role: log.admin.role,
							department: log.admin.department
								? {
										id: log.admin.department.id,
										name: log.admin.department.name,
								  }
								: null,
					  }
					: null,
				targetProduct: log.targetProduct
					? {
							id: log.targetProduct.id,
							title: log.targetProduct.title,
							sku: log.targetProduct.sku,
							brand: log.targetProduct.brand,
							price: log.targetProduct.price,
					  }
					: null,
				department: log.admin?.department
					? {
							id: log.admin.department.id,
							name: log.admin.department.name,
					  }
					: null,
				snapshotBefore: log.snapshotBefore,
				snapshotAfter: log.snapshotAfter,
				userSnapshot: log.userSnapshot,
				departmentSnapshot: log.departmentSnapshot,
				productSnapshot: log.targetProduct,
				// Добавляем данные лога импорта
				importLogData: log.importLogData,
				importLogId: log.importLogId,
			}));

			setLocalLogs(formattedLogs);
			setTotalPages(data.totalPages || 1);
			setTotalCount(data.total || 0);

			// Уведомляем родительский компонент об обновлении данных
			if (onLogsUpdate) {
				onLogsUpdate(data.total || 0, data.totalPages || 1);
			}

			// Проверяем существование пользователей из логов (админов)
			const userIdsToCheck = formattedLogs.map((log: ProductLog) => log.admin?.id).filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

			await checkUsersExistence(userIdsToCheck);

			const adminDepartmentIds = formattedLogs
				.map((log: ProductLog) => {
					return log.admin?.department?.id;
				})
				.filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

			const productDepartmentIds = formattedLogs
				.map((log: ProductLog) => {
					// Используем отдел из snapshotBefore, если в targetProduct его нет
					const departmentId = log.targetProduct?.department?.id || log.snapshotBefore?.department?.id;
					return departmentId;
				})
				.filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

			const departmentIdsToCheck = [...new Set([...adminDepartmentIds, ...productDepartmentIds])];

			await checkDepartmentsExistence(departmentIdsToCheck);

			// Проверяем существование товаров из логов
			const productIdsToCheck = formattedLogs.map((log: ProductLog) => log.targetProduct?.id).filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

			await checkProductsExistence(productIdsToCheck);
		} catch (err) {
			console.error("Ошибка при загрузке логов:", err);
			setError(err instanceof Error ? err.message : "Неизвестная ошибка");
		} finally {
			setLoading(false);
		}
	}, [queryParams, onLogsUpdate, checkUsersExistence, checkDepartmentsExistence, checkProductsExistence]);

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
						<a href={`/admin/departments/${department.id}`} className={`itemLink`}>
							{actualName}
						</a>
					);
				} else {
					// Если названия разные, показываем название из снапшота и актуальное название в скобочках со ссылкой
					return (
						<span>
							{snapshotName}{" "}
							<a href={`/admin/departments/${department.id}`} className={`itemLink`}>
								({actualName})
							</a>
						</span>
					);
				}
			} else {
				// Если отдела не существует, показываем пометку с названием из снапшота
				return (
					<span>
						{snapshotName} <span className={`deletedItemStatus`}>(отдел удалён)</span>
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

	// Функция для отображения ссылки на отдел с разворачивающимся блоком
	const renderDepartmentLink = useCallback(
		(log: ProductLog, department: { id: number; name: string }, logId: number) => {
			// Проверяем, существует ли отдел в базе данных
			const departmentExists = existingDepartments.has(department.id);
			// Получаем актуальные данные отдела из departmentsData
			const actualDepartment = departmentsData.get(department.id);
			const departmentLogKey = `department_${logId}_${department.id}`;

			return (
				<div key={departmentLogKey} className={`fullInfoBlock`}>
					<div className={`clickInfoBlock ${activeBlocks[departmentLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(departmentLogKey)}>
						{department.name}
					</div>
					<div className={`openingBlock ${activeBlocks[departmentLogKey] ? "active" : ""}`}>
						<div className="infoField">
							<span className="title">ID:</span>
							<span className="value">{department.id || "—"}</span>
						</div>
						{departmentExists ? (
							<div className="infoField">
								<span className="title">Ссылка:</span>
								<span className="value">
									<a href={`/admin/departments/${department.id}`} className="itemLink">
										{actualDepartment?.name || department.name}
									</a>
								</span>
							</div>
						) : (
							<div className="infoField">
								<span className="title">Статус:</span>
								<span className="value deletedItemStatus">Отдел удален</span>
							</div>
						)}
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, existingDepartments, departmentsData]
	);

	// Функция для отображения ссылки на товар с разворачивающимся блоком
	const renderProductLink = useCallback(
		(
			log: ProductLog,
			product: { id: number; title?: string; sku?: string; brand?: string; price?: number; description?: string; category?: any; department?: any },
			logId: number
		) => {
			// Проверяем, существует ли товар в базе данных
			const productExists = existingProducts.has(product.id);
			// Получаем актуальные данные товара из existingProducts
			const actualProduct = existingProducts.get(product.id);
			const productLogKey = `product_${logId}_${product.id}`;
			return (
				<div key={productLogKey} className={`fullInfoBlock`}>
					<div className={`clickInfoBlock ${activeBlocks[productLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(productLogKey)}>
						{product.title || "—"}
					</div>
					<div className={`openingBlock ${activeBlocks[productLogKey] ? "active" : ""}`}>
						<div className="infoField">
							<span className="title">ID:</span>
							<span className="value">{product.id || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">SKU:</span>
							<span className="value">{product.sku || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Бренд:</span>
							<span className="value">{product.brand || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Цена:</span>
							<span className="value">{product.price || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Категория:</span>
							<span className="value">{product.category?.title || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Отдел:</span>
							<span className="value">{renderDepartment(product.department)}</span>
						</div>
						<div className="infoField">
							<span className="title">Описание:</span>
							<span className="value">{product.description || "—"}</span>
						</div>
						{productExists ? (
							<div className="infoField">
								<span className="title">Страница товара:</span>
								<span className="value">
									<a href={`/admin/product-management/products/${product.id}`} className="itemLink">
										{actualProduct?.title || product.title}
									</a>
								</span>
							</div>
						) : (
							<div className="infoField">
								<span className="title">Статус:</span>
								<span className="value deletedProductStatus">Товар удален</span>
							</div>
						)}
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, existingProducts]
	);

	// Функция для отображения ссылки на пользователя
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
			const userLogKey = `${userType}_${logId}_${user.id}_${userType}`;

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
		(log: ProductLog): React.ReactNode => {
			console.log(log);
			const action = log.action;
			const userExists = log.admin ? existingUsers.has(log.admin.id) : false;
			// Получаем актуальные данные пользователя из existingUsers
			const actualUser = log.admin ? existingUsers.get(log.admin.id) : null;

			if (action === "create") {
				const createLogKey = `create_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock create`}>
								<div className={`clickInfoBlock ${activeBlocks[createLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(createLogKey)}>
									Создание продукта
								</div>
								<div className={`openingBlock ${activeBlocks[createLogKey] ? "active" : ""}`}>
									{log.snapshotAfter && (
										<>
											<div className="infoField">
												<span className="title">Название:</span>
												<span className="value">{log.snapshotAfter.title || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">SKU:</span>
												<span className="value">{log.snapshotAfter.sku || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Бренд:</span>
												<span className="value">{log.snapshotAfter.brand || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Цена:</span>
												<span className="value">{log.snapshotAfter.price || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Описание:</span>
												<span className="value">{log.snapshotAfter.description || "—"}</span>
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			} else if (action === "delete") {
				const deleteLogKey = `delete_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock remove`}>
								<div className={`clickInfoBlock ${activeBlocks[deleteLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(deleteLogKey)}>
									Удаление продукта
								</div>
								<div className={`openingBlock ${activeBlocks[deleteLogKey] ? "active" : ""}`}>
									{log.snapshotBefore && (
										<>
											<div className="infoField">
												<span className="title">Название:</span>
												<span className="value">{log.snapshotBefore.title || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">SKU:</span>
												<span className="value">{log.snapshotBefore.sku || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Бренд:</span>
												<span className="value">{log.snapshotBefore.brand || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Цена:</span>
												<span className="value">{log.snapshotBefore.price || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Описание:</span>
												<span className="value">{log.snapshotBefore.description || "—"}</span>
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			} else if (action === "update") {
				// Создаем уникальный ключ для блока изменений
				const updateLogKey = `update_${log.id}`;

				// Проверяем, что именно изменилось
				const titleChanged = log.snapshotBefore?.title !== log.snapshotAfter?.title;
				const skuChanged = log.snapshotBefore?.sku !== log.snapshotAfter?.sku;
				const brandChanged = log.snapshotBefore?.brand !== log.snapshotAfter?.brand;
				const priceChanged = log.snapshotBefore?.price !== log.snapshotAfter?.price;
				const descriptionChanged = log.snapshotBefore?.description !== log.snapshotAfter?.description;

				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock update`}>
								<div className={`clickInfoBlock ${activeBlocks[updateLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(updateLogKey)}>
									Редактирование продукта
								</div>
								<div className={`openingBlock ${activeBlocks[updateLogKey] ? "active" : ""}`}>
									{/* Показываем изменения в виде таблицы */}
									{(titleChanged || skuChanged || brandChanged || priceChanged || descriptionChanged) && (
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
													{descriptionChanged && (
														<tr>
															<td>Описание</td>
															<td className="oldValue">{log.snapshotBefore?.description || "Не указано"}</td>
															<td className="newValue">{log.snapshotAfter?.description || "Не указано"}</td>
														</tr>
													)}
												</tbody>
											</table>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			} else if (action === "import") {
				const importLogKey = `import_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock create`}>
								<div className={`clickInfoBlock ${activeBlocks[importLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(importLogKey)}>
									Импорт продуктов
								</div>
								<div className={`openingBlock ${activeBlocks[importLogKey] ? "active" : ""}`}>
									<div className="infoField">
										<span className="title">Сообщение:</span>
										<span className="value">{log.message || "—"}</span>
									</div>
									{log.importLogData && (
										<>
											<div className="infoField">
												<span className="title">Файл:</span>
												<span className="value">{log.importLogData.file_name || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Статистика:</span>
												<span className="value">
													Создано: {log.importLogData.created || 0}, Обновлено: {log.importLogData.updated || 0}, Пропущено:{" "}
													{log.importLogData.skipped || 0}
												</span>
											</div>
										</>
									)}

									{log.importLogId && (
										<button
											className="viewDetailsButton"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												if (log.importLogId) {
													setShowImportDetails(log.importLogId);
													// Загружаем детали если их еще нет
													if (!importDetailsData.has(log.importLogId)) {
														loadImportDetails(log.importLogId);
													}
												}
											}}
										>
											Показать детали всех изменений
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}
			return null;
		},
		[activeBlocks, toggleActiveBlock, existingUsers, showImportDetails, importDetailsData, loadImportDetails]
	);

	useEffect(() => {
		fetchLogs();
	}, [fetchLogs]);

	// Загружаем данные отделов при монтировании компонента
	useEffect(() => {
		loadDepartmentsData();
	}, [loadDepartmentsData]);

	return (
		<div className={`tableContent`}>
			<table>
				<thead>{tableHeaders}</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={5}>
								<Loading />
							</td>
						</tr>
					) : localLogs.length > 0 ? (
						localLogs.map((log: ProductLog) => {
							return (
								<tr key={log.id}>
									<td>
										<div className="date">{formatDate(log.createdAt)}</div>
									</td>
									<td>{log.admin ? renderUserLink(log, log.admin, log.id, "admin") : "—"}</td>
									<td>{log.department ? renderDepartmentLink(log, log.department, log.id) : "—"}</td>
									<td>
										{log.action === "import" ? (
											<div className="importProductCell">
												<span className="importLabel">Импорт товаров</span>
												{log.importLogId && (
													<button
														className="viewDetailsButton"
														onClick={(e) => {
															e.preventDefault();
															e.stopPropagation();
															if (log.importLogId) {
																setShowImportDetails(log.importLogId);
																// Загружаем детали если их еще нет
																if (!importDetailsData.has(log.importLogId)) {
																	loadImportDetails(log.importLogId);
																}
															}
														}}
													>
														Показать детали изменений
													</button>
												)}
											</div>
										) : log.targetProduct ? (
											renderProductLink(log, log.snapshotBefore, log.id)
										) : (
											"—"
										)}
									</td>
									<td>{getResultBlock(log)}</td>
								</tr>
							);
						})
					) : (
						<tr>
							<td colSpan={5}>Логи не найдены</td>
						</tr>
					)}
				</tbody>
			</table>

			{/* Модальное окно с деталями импорта */}
			{showImportDetails && <ImportDetailsComponent importLogId={showImportDetails} onClose={() => setShowImportDetails(null)} />}
		</div>
	);
}
