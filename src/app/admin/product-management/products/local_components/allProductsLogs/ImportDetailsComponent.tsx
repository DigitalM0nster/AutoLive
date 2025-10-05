"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ProductLog } from "@/lib/types";
import Loading from "@/components/ui/loading/Loading";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";

type ImportDetailsComponentProps = {
	importLogId: number;
	onClose: () => void;
};

export default function ImportDetailsComponent({ importLogId, onClose }: ImportDetailsComponentProps) {
	const [logs, setLogs] = useState<ProductLog[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [actionFilter, setActionFilter] = useState<string>("all");
	const [productSearch, setProductSearch] = useState("");
	const [skippedProducts, setSkippedProducts] = useState<any[]>([]);
	const [duplicateProducts, setDuplicateProducts] = useState<any[]>([]);
	const [importLog, setImportLog] = useState<any>(null);
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});
	// Храним Map с ID товара как ключом и полными данными как значением
	const [existingProducts, setExistingProducts] = useState<Map<number, any>>(new Map());

	const limit = 10;

	// Функция для переключения активного состояния блока
	const toggleActiveBlock = useCallback((logId: number | string) => {
		setActiveBlocks((prev) => ({
			...prev,
			[logId]: !prev[logId],
		}));
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

	// Объединяем все данные для отображения в одной таблице
	const displayData = useMemo(() => {
		let allData = [...logs];

		// Добавляем пропущенные товары как логи (пустые товары уже отфильтрованы в API)
		skippedProducts.forEach((product, index) => {
			allData.push({
				id: -(index + 1), // Используем отрицательные ID для пропущенных товаров
				createdAt: importLog?.created_at || new Date().toISOString(),
				action: "skipped",
				message: "Товар пропущен при импорте",
				admin: undefined,
				targetProduct: undefined,
				snapshotBefore: null,
				snapshotAfter: null,
				userSnapshot: null,
				departmentSnapshot: null,
				importLogId: importLogId,
				// Данные пропущенного товара
				skippedProduct: product,
			});
		});

		// Добавляем повторы как логи со специальным действием
		duplicateProducts.forEach((product, index) => {
			allData.push({
				id: -(index + 1000), // Используем отрицательные ID для повторных товаров
				createdAt: importLog?.created_at || new Date().toISOString(),
				action: "duplicate",
				message: "Товар является повтором",
				admin: undefined,
				targetProduct: undefined,
				snapshotBefore: null,
				snapshotAfter: null,
				userSnapshot: null,
				departmentSnapshot: null,
				importLogId: importLogId,
				// Данные повторного товара
				duplicateProduct: product,
			});
		});

		// Сортируем по дате (новые сверху)
		allData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		// Применяем фильтр
		if (actionFilter && actionFilter !== "all") {
			allData = allData.filter((item) => item.action === actionFilter);
		}

		return allData;
	}, [actionFilter, logs, skippedProducts, duplicateProducts, importLog, importLogId]);

	// Мемоизируем параметры запроса
	const queryParams = useMemo(() => {
		const params = new URLSearchParams({
			page: currentPage.toString(),
			limit: limit.toString(),
		});

		if (actionFilter && actionFilter !== "all") {
			params.append("action", actionFilter);
		}

		if (productSearch && productSearch.trim() !== "") {
			params.append("productSearch", productSearch.trim());
		}

		return params;
	}, [currentPage, actionFilter, productSearch]);

	// Функция для загрузки логов товаров импорта
	const fetchImportLogs = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/products/logs/${importLogId}/products?${queryParams.toString()}`);

			if (!response.ok) {
				throw new Error("Не удалось загрузить логи товаров импорта");
			}

			const data = await response.json();

			if (data.error) {
				throw new Error(data.error);
			}

			setLogs(data.data || []);
			setTotalPages(data.totalPages || 1);
			setTotalCount(data.total || 0);
			setSkippedProducts(data.skippedProducts || []);
			setDuplicateProducts(data.duplicateProducts || []);
			setImportLog(data.importLog || null);

			// Проверяем существование товаров из логов
			const productIdsToCheck = (data.data || []).map((log: any) => log.targetProduct?.id).filter((id: number | undefined) => id !== undefined && id !== 0) as number[];

			await checkProductsExistence(productIdsToCheck);
		} catch (err) {
			console.error("Ошибка при загрузке логов товаров импорта:", err);
			setError(err instanceof Error ? err.message : "Неизвестная ошибка");
		} finally {
			setLoading(false);
		}
	}, [importLogId, queryParams]);

	// Загружаем логи при изменении параметров
	useEffect(() => {
		fetchImportLogs();
	}, [fetchImportLogs]);

	// Сбрасываем страницу при изменении фильтров
	const handleActionChange = useCallback((value: string) => {
		setActionFilter(value);
		setCurrentPage(1);
	}, []);

	const handleProductSearchChange = useCallback((value: string) => {
		setProductSearch(value);
		setCurrentPage(1);
	}, []);

	// Функция для получения описания действия
	const getActionDescription = useCallback((action: string): string => {
		switch (action) {
			case "create":
				return "Создание";
			case "update":
				return "Редактирование";
			case "delete":
				return "Удаление";
			case "skipped":
				return "Пропущено";
			case "duplicate":
				return "Повтор";
			default:
				return action || "Действие";
		}
	}, []);

	// Функция для отображения имени пользователя
	const getUserName = useCallback((user: { first_name: string | null; last_name: string | null; middle_name?: string | null }) => {
		if (!user) return "—";
		return `${user.last_name || ""} ${user.first_name || ""} ${user.middle_name || ""}`.trim() || "—";
	}, []);

	// Функция для отображения ссылки на товар с разворачивающимся блоком
	const renderProductLink = useCallback(
		(
			log: ProductLog,
			product: { id: number; title?: string; sku?: string; brand?: string; price?: number; description?: string; category?: any; department?: any } | null,
			logId: number
		) => {
			// Проверяем, что товар существует и имеет ID
			if (!product || !product.id) {
				return "—";
			}

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

	// Функция для отображения блока с результатами
	const getResultBlock = useCallback(
		(log: ProductLog) => {
			const action = log.action;

			if (action === "create") {
				const createLogKey = `create_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock create">
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
											<div className="infoField">
												<span className="title">Категория:</span>
												<span className="value">
													{log.snapshotAfter.category?.title || (log.snapshotAfter.categoryId ? `ID: ${log.snapshotAfter.categoryId}` : "—")}
												</span>
											</div>
											<div className="infoField">
												<span className="title">Отдел:</span>
												<span className="value">{log.departmentSnapshot?.name || "—"}</span>
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			} else if (action === "update") {
				// Проверяем, что именно изменилось
				const titleChanged = log.snapshotBefore?.title !== log.snapshotAfter?.title;
				const skuChanged = log.snapshotBefore?.sku !== log.snapshotAfter?.sku;
				const brandChanged = log.snapshotBefore?.brand !== log.snapshotAfter?.brand;
				const priceChanged = log.snapshotBefore?.price !== log.snapshotAfter?.price;
				const categoryChanged = log.snapshotBefore?.categoryId !== log.snapshotAfter?.categoryId;
				const departmentChanged = log.snapshotBefore?.departmentId !== log.snapshotAfter?.departmentId;

				const updateLogKey = `update_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock update">
								<div className={`clickInfoBlock ${activeBlocks[updateLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(updateLogKey)}>
									Редактирование продукта
								</div>
								<div className={`openingBlock ${activeBlocks[updateLogKey] ? "active" : ""}`}>
									{/* Показываем изменения в виде таблицы */}
									{(titleChanged || skuChanged || brandChanged || priceChanged || categoryChanged || departmentChanged) && (
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
															<td className="oldValue">
																{log.snapshotBefore?.category?.title ||
																	(log.snapshotBefore?.categoryId ? `ID: ${log.snapshotBefore.categoryId}` : "Не указано")}
															</td>
															<td className="newValue">
																{log.snapshotAfter?.category?.title ||
																	(log.snapshotAfter?.categoryId ? `ID: ${log.snapshotAfter.categoryId}` : "Не указано")}
															</td>
														</tr>
													)}
													{departmentChanged && (
														<tr>
															<td>Отдел</td>
															<td className="oldValue">
																{log.snapshotBefore?.department?.name ||
																	(log.snapshotBefore?.departmentId ? `ID: ${log.snapshotBefore.departmentId}` : "Не указано")}
															</td>
															<td className="newValue">
																{log.snapshotAfter?.department?.name ||
																	(log.snapshotAfter?.departmentId ? `ID: ${log.snapshotAfter.departmentId}` : "Не указано")}
															</td>
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
			} else if (action === "skipped") {
				const skippedLogKey = `skipped_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock skipped">
								<div className={`clickInfoBlock ${activeBlocks[skippedLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(skippedLogKey)}>
									Пропущенный товар
								</div>
								<div className={`openingBlock ${activeBlocks[skippedLogKey] ? "active" : ""}`}>
									{log.skippedProduct && (
										<>
											<div className="infoField">
												<span className="title">Название:</span>
												<span className="value">{log.skippedProduct.title || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">SKU:</span>
												<span className="value">{log.skippedProduct.sku || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Бренд:</span>
												<span className="value">{log.skippedProduct.brand || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Цена:</span>
												<span className="value">{log.skippedProduct.price || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Причина пропуска:</span>
												<span className="value">{log.skippedProduct.skipReason || "Причина не указана"}</span>
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			} else if (action === "duplicate") {
				const duplicateLogKey = `duplicate_${log.id}`;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock duplicate">
								<div className={`clickInfoBlock ${activeBlocks[duplicateLogKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(duplicateLogKey)}>
									Повторный товар
								</div>
								<div className={`openingBlock ${activeBlocks[duplicateLogKey] ? "active" : ""}`}>
									{log.duplicateProduct && (
										<>
											<div className="infoField">
												<span className="title">Название:</span>
												<span className="value">{log.duplicateProduct.title || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">SKU:</span>
												<span className="value">{log.duplicateProduct.sku || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Бренд:</span>
												<span className="value">{log.duplicateProduct.brand || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Цена:</span>
												<span className="value">{log.duplicateProduct.price || "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Причина повтора:</span>
												<span className="value">{log.duplicateProduct.duplicateReason || "Товар уже существует"}</span>
											</div>
											{log.duplicateProduct.existingProductId && (
												<div className="infoField">
													<span className="title">Существующий товар:</span>
													<span className="value">
														<a href={`/admin/product-management/products/${log.duplicateProduct.existingProductId}`} className="itemLink">
															Перейти к товару
														</a>
													</span>
												</div>
											)}
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			return null;
		},
		[activeBlocks, toggleActiveBlock]
	);

	// Мемоизируем опции для селекта действий
	const actionOptions = useMemo(
		() => [
			{ value: "all", label: "Все действия" },
			{ value: "create", label: "Создание" },
			{ value: "update", label: "Редактирование" },
			{ value: "skipped", label: "Пропущено" },
			{ value: "duplicate", label: "Повторы" },
		],
		[]
	);

	return (
		<div className="importDetailsModal">
			<div className="importDetailsBackground" onClick={onClose} />
			<div className="importDetailsCloseButton" onClick={onClose}>
				<div className="line" />
				<div className="line" />
			</div>
			<div className="importDetailsContent">
				<div className="importDetailsHeader">
					<h3>Детали импорта товаров</h3>
				</div>

				<div className="importDetailsFilters">
					<div className="filterGroup">
						<label>Тип действия:</label>
						<CustomSelect options={actionOptions} value={actionFilter} onChange={handleActionChange} placeholder="Выберите действие" />
					</div>

					<div className="filterGroup">
						<label>Поиск по товару:</label>
						<div className="searchInput">
							<input
								type="text"
								value={productSearch}
								onChange={(e) => handleProductSearchChange(e.target.value)}
								placeholder="Введите название товара, бренд или SKU"
								className="searchInput"
							/>
						</div>
					</div>
				</div>

				<div className="importDetailsTable">
					{loading ? (
						<Loading />
					) : error ? (
						<div className="errorMessage">{error}</div>
					) : displayData.length > 0 ? (
						<table>
							<thead>
								<tr>
									<th className="dateCell">Дата</th>
									<th className="actionCell">Действие</th>
									<th>Товар</th>
									<th>Детали</th>
								</tr>
							</thead>
							<tbody>
								{displayData.map((item: any, index: number) => (
									<tr key={item.id}>
										<td>
											<div className="date">
												{new Intl.DateTimeFormat("ru", {
													day: "2-digit",
													month: "2-digit",
													year: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												}).format(new Date(item.createdAt))}
											</div>
										</td>
										<td>
											<span className={`actionBadge ${item.action}`}>{getActionDescription(item.action)}</span>
										</td>
										<td>
											{item.action === "skipped" && item.skippedProduct ? (
												<span>
													{item.skippedProduct.title || "Без названия"} (SKU: {item.skippedProduct.sku || "—"})
												</span>
											) : item.action === "duplicate" && item.duplicateProduct ? (
												<span>
													{item.duplicateProduct.title || "Без названия"} (SKU: {item.duplicateProduct.sku || "—"})
												</span>
											) : (
												renderProductLink(item, item.targetProduct || item.snapshotBefore || item.snapshotAfter, item.id)
											)}
										</td>
										<td>{getResultBlock(item)}</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<div className="noDataMessage">Логи товаров не найдены</div>
					)}
				</div>

				{totalPages > 1 && (
					<div className="importDetailsPagination">
						<Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
					</div>
				)}

				<div className="importDetailsInfo">Показано {displayData.length} записей</div>
			</div>
		</div>
	);
}
