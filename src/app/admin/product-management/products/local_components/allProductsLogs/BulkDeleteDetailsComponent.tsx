"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Loading from "@/components/ui/loading/Loading";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";

type Props = {
	bulkLogId: number;
	productsSnapshot: any[];
	onClose: () => void;
};

export default function BulkDeleteDetailsComponent({ bulkLogId, productsSnapshot, onClose }: Props) {
	console.log("📦 BulkDeleteDetailsComponent - productsSnapshot:", productsSnapshot);

	const [currentPage, setCurrentPage] = useState(1);
	const [productSearch, setProductSearch] = useState("");
	const [departmentFilter, setDepartmentFilter] = useState("all");
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});

	// Состояние для работы с отделами
	const [existingDepartments, setExistingDepartments] = useState<Set<number>>(new Set());
	const [departmentsData, setDepartmentsData] = useState<Map<number, { id: number; name: string }>>(new Map());

	const limit = 10;

	// Функция для переключения активного состояния блока
	const toggleActiveBlock = useCallback((logId: number | string) => {
		setActiveBlocks((prev) => ({
			...prev,
			[logId]: !prev[logId],
		}));
	}, []);

	// Функция для проверки существования отделов
	const checkDepartmentsExistence = useCallback(async () => {
		try {
			// Собираем все ID отделов из productsSnapshot
			const departmentIds = productsSnapshot.map((product) => product.department?.id).filter((id) => id !== undefined && id !== null);

			console.log("🔍 ID отделов из productsSnapshot:", departmentIds);

			if (departmentIds.length === 0) {
				console.log("🔍 Нет отделов для проверки");
				setExistingDepartments(new Set());
				return;
			}

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
				console.log("🔍 Загружены существующие отделы:", existingIds);
				setExistingDepartments(new Set(existingIds));
			} else {
				console.error("Ошибка API при проверке существования отделов:", response.status, response.statusText);
			}
		} catch (error) {
			console.error("Ошибка при проверке существования отделов:", error);
		}
	}, [productsSnapshot]);

	// Функция для загрузки актуальных данных отделов
	const loadDepartmentsData = useCallback(async () => {
		try {
			const response = await fetch(`/api/departments`, {
				credentials: "include",
			});

			if (response.ok) {
				const departments = await response.json();
				console.log("🏢 Загружены данные отделов:", departments);
				const departmentsMap = new Map<number, { id: number; name: string }>(departments.map((dept: { id: number; name: string }) => [dept.id, dept]));
				setDepartmentsData(departmentsMap);
			} else {
				console.error("Ошибка при загрузке данных отделов:", response.status, response.statusText);
			}
		} catch (error) {
			console.error("Ошибка при загрузке данных отделов:", error);
		}
	}, []);

	// Функция для отображения отдела с ссылкой, если отдел существует
	const renderDepartmentLink = useCallback(
		(department: any) => {
			if (!department || !department.id) {
				return "—";
			}

			console.log("🔍 Рендер отдела:", department);
			console.log("🔍 Существующие отделы:", Array.from(existingDepartments));
			console.log("🔍 Данные отделов:", Array.from(departmentsData.entries()));

			const departmentExists = existingDepartments.has(department.id);
			console.log("🔍 Отдел существует?", departmentExists, "для ID:", department.id);

			// Получаем актуальное название отдела
			const actualDepartment = departmentsData.get(department.id);
			const snapshotName = department.name;
			const actualName = actualDepartment ? actualDepartment.name : snapshotName;

			if (departmentExists) {
				// Если отдел существует
				if (snapshotName === actualName) {
					// Если названия совпадают, показываем только актуальное название ссылкой
					return (
						<a href={`/admin/departments/${department.id}`} className="itemLink">
							{actualName}
						</a>
					);
				} else {
					// Если названия разные, показываем название из снапшота и актуальное название в скобочках со ссылкой
					return (
						<span>
							{snapshotName}{" "}
							<a href={`/admin/departments/${department.id}`} className="itemLink">
								({actualName})
							</a>
						</span>
					);
				}
			} else {
				// Если отдела не существует, показываем пометку с названием из снапшота
				return (
					<span>
						{snapshotName} <span className="deletedItemStatus">(отдел удалён)</span>
					</span>
				);
			}
		},
		[existingDepartments, departmentsData]
	);

	// Обработчик изменения поиска
	const handleProductSearchChange = useCallback((value: string) => {
		setProductSearch(value);
		setCurrentPage(1);
	}, []);

	// Обработчик изменения фильтра по отделу
	const handleDepartmentChange = useCallback((value: string) => {
		setDepartmentFilter(value);
		setCurrentPage(1);
	}, []);

	// Фильтрация товаров
	const filteredProducts = useMemo(() => {
		return productsSnapshot.filter((product) => {
			const matchesSearch =
				productSearch === "" ||
				product.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
				product.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
				product.brand?.toLowerCase().includes(productSearch.toLowerCase());

			const matchesDepartment = departmentFilter === "all" || product.department?.name === departmentFilter;

			return matchesSearch && matchesDepartment;
		});
	}, [productSearch, departmentFilter, productsSnapshot]);

	// Пагинация
	const totalPages = Math.ceil(filteredProducts.length / limit);
	const pageItems = filteredProducts.slice((currentPage - 1) * limit, currentPage * limit);

	// Опции для фильтра по отделу
	const departmentOptions = useMemo(() => {
		const departments = new Set<string>();
		productsSnapshot.forEach((product) => {
			if (product.department?.name) {
				departments.add(product.department.name);
			}
		});

		return [
			{ value: "all", label: "Все отделы" },
			...Array.from(departments)
				.sort()
				.map((dept) => ({
					value: dept,
					label: dept,
				})),
		];
	}, [productsSnapshot]);

	// Функция для отображения товара с разворачивающимся блоком
	const renderProductBlock = useCallback(
		(product: any, index: number) => {
			// Проверяем, что товар существует и имеет ID
			if (!product || !product.id) {
				return "—";
			}

			const productKey = `product_${index}_${product.id}`;

			return (
				<div key={productKey} className={`fullInfoBlock`}>
					<div className={`clickInfoBlock ${activeBlocks[productKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(productKey)}>
						{product.title || "Без названия"}
					</div>
					<div className={`openingBlock ${activeBlocks[productKey] ? "active" : ""}`}>
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
							<span className="title">Цена на сайте:</span>
							<span className="value">{product.price ? `${product.price} ₽` : "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Цена поставщика:</span>
							<span className="value">{product.supplierPrice ? `${product.supplierPrice} ₽` : "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Описание:</span>
							<span className="value">{product.description || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Отдел:</span>
							<span className="value">{renderDepartmentLink(product.department)}</span>
						</div>
						<div className="infoField">
							<span className="title">Категория:</span>
							<span className="value">{product.category?.title || "Без категории"}</span>
						</div>
						<div className="infoField">
							<span className="title">Изображение:</span>
							<span className="value">
								{product.image ? (
									<a href={product.image} target="_blank" rel="noopener noreferrer" className="itemLink">
										Открыть изображение
									</a>
								) : (
									"Не указано"
								)}
							</span>
						</div>
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, renderDepartmentLink]
	);

	// Загружаем данные отделов при монтировании компонента
	useEffect(() => {
		checkDepartmentsExistence();
		loadDepartmentsData();
	}, [checkDepartmentsExistence, loadDepartmentsData]);

	return (
		<div className="importDetailsModal">
			<div className="importDetailsBackground" onClick={onClose} />
			<div className="importDetailsCloseButton" onClick={onClose}>
				<div className="line" />
				<div className="line" />
			</div>
			<div className="importDetailsContent">
				<div className="importDetailsHeader">
					<h3>Детали массового удаления</h3>
				</div>

				<div className="importDetailsFilters">
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

					<div className="filterGroup">
						<label>Отдел:</label>
						<CustomSelect options={departmentOptions} value={departmentFilter} onChange={handleDepartmentChange} placeholder="Выберите отдел" />
					</div>
				</div>

				<div className="importDetailsTable">
					{pageItems.length > 0 ? (
						<table>
							<thead>
								<tr>
									<th className="idCell">ID</th>
									<th>Название</th>
									<th>SKU</th>
									<th>Бренд</th>
									<th>Детали</th>
								</tr>
							</thead>
							<tbody>
								{pageItems.map((product, index) => (
									<tr key={product.id || index}>
										<td className="idCell">{product.id || "—"}</td>
										<td>{product.title || "Без названия"}</td>
										<td>{product.sku || "—"}</td>
										<td>{product.brand || "—"}</td>
										<td>{renderProductBlock(product, index)}</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<div className="noDataMessage">Товары не найдены</div>
					)}
				</div>

				{totalPages > 1 && (
					<div className="importDetailsPagination">
						<Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
					</div>
				)}

				<div className="importDetailsInfo">
					Показано {pageItems.length} из {filteredProducts.length} товаров (всего удалено: {productsSnapshot.length})
				</div>
			</div>
		</div>
	);
}
