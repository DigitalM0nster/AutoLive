"use client";

import React, { useEffect, useState } from "react";
import styles from "../styles.module.scss";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import { Order, OrderResponse, OrderStatus, ActiveFilter } from "@/lib/types";
import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import { useRouter } from "next/navigation";

// Компонент для поиска ответственного
const ManagerSearchField = React.memo(
	({ managerSearch, onSearchChange, onClearSearch }: { managerSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Ответственный:
			<div className="searchInput">
				<input type="text" value={managerSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Введите имя ответственного" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
);
ManagerSearchField.displayName = "ManagerSearchField";

// Компонент для поиска клиента
const ClientSearchField = React.memo(
	({ clientSearch, onSearchChange, onClearSearch }: { clientSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Клиент:
			<div className="searchInput">
				<input type="text" value={clientSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Введите имя клиента" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
);
ClientSearchField.displayName = "ClientSearchField";

// Компонент для поиска по ID
const IdSearchField = React.memo(({ idSearch, onSearchChange, onClearSearch }: { idSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
	<div className="searchFilterHeader">
		ID:
		<div className="searchInput">
			<input type="text" value={idSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Введите ID заказа" />
			<div onClick={onClearSearch} className="clearSearchButton"></div>
		</div>
	</div>
));
IdSearchField.displayName = "IdSearchField";

export default function AllOrdersTable() {
	const router = useRouter();
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

	// Состояние для поиска
	const [managerSearch, setManagerSearch] = useState("");
	const [clientSearch, setClientSearch] = useState("");
	const [departmentFilter, setDepartmentFilter] = useState<"all" | string>("all");
	const [actionFilter, setActionFilter] = useState<"all" | string>("all");
	const [idSearch, setIdSearch] = useState("");

	// Состояние для сортировки
	const [sortBy, setSortBy] = useState<"id" | "title" | "status" | "createdAt" | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

	// Состояние для фильтра по дате
	const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({ from: "", to: "" });
	const [showDateFilter, setShowDateFilter] = useState(false);

	// Состояние для активных блоков (разворачивающаяся информация)
	const [activeBlocks, setActiveBlocks] = useState<{ [key: string]: boolean }>({});

	// Данные для селектов
	const [managers, setManagers] = useState<{ id: number; first_name: string | null; last_name: string | null; middle_name: string | null }[]>([]);
	const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
	const [clients, setClients] = useState<{ id: number; first_name: string | null; last_name: string | null; middle_name: string | null }[]>([]);

	const limit = 10;

	// Функция для получения имени пользователя
	const getUserName = (user: { first_name?: string | null; last_name?: string | null; middle_name?: string | null }) => {
		const parts = [];
		if (user.first_name) parts.push(user.first_name);
		if (user.last_name) parts.push(user.last_name);
		if (user.middle_name) parts.push(user.middle_name);
		return parts.length > 0 ? parts.join(" ") : "Не указано";
	};

	// Опции для CustomSelect
	const statusOptions = [
		{ value: "all", label: "Все статусы" },
		{ value: "created", label: "Создан" },
		{ value: "confirmed", label: "Подтверждён" },
		{ value: "booked", label: "Забронирован" },
		{ value: "ready", label: "Готов к выдаче" },
		{ value: "paid", label: "Оплачен" },
		{ value: "completed", label: "Выполнен" },
		{ value: "returned", label: "Возврат" },
	];

	// Опции для менеджеров
	const managerOptions = [
		{ value: "none", label: "Не назначен" },
		...managers.map((manager) => ({
			value: manager.id.toString(),
			label: getUserName(manager),
		})),
	];

	// Опции для отделов
	const departmentOptions = [
		{ value: "all", label: "Все отделы" },
		{ value: "none", label: "Без отдела" },
		...departments.map((dept) => ({
			value: dept.id.toString(),
			label: dept.name,
		})),
	];

	// Опции для клиентов
	const clientOptions = [
		{ value: "none", label: "Не выбран" },
		...clients.map((client) => ({
			value: client.id.toString(),
			label: getUserName(client),
		})),
	];

	// Опции для действий
	const actionOptions = [
		{ value: "all", label: "Все действия" },
		{ value: "create", label: "Создание" },
		{ value: "update", label: "Обновление" },
		{ value: "assign", label: "Назначение" },
		{ value: "unassign", label: "Снятие назначения" },
		{ value: "status_change", label: "Изменение статуса" },
		{ value: "cancel", label: "Отмена" },
	];

	// Загрузка заказов
	useEffect(() => {
		const fetchOrders = async () => {
			setLoading(true);
			try {
				const params = new URLSearchParams({
					page: page.toString(),
					limit: limit.toString(),
				});

				if (statusFilter !== "all") params.append("status", statusFilter);

				// Добавляем фильтр по дате
				if (dateFilter.from) params.append("dateFrom", dateFilter.from);
				if (dateFilter.to) params.append("dateTo", dateFilter.to);

				if (managerSearch) params.append("managerSearch", managerSearch);
				if (clientSearch) params.append("clientSearch", clientSearch);
				if (departmentFilter !== "all") params.append("departmentId", departmentFilter === "none" ? "null" : departmentFilter);
				if (idSearch) params.append("idSearch", idSearch);

				if (sortBy && sortOrder) {
					params.append("sortBy", sortBy);
					params.append("sortOrder", sortOrder);
				}

				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 15000);
				const response = await fetch(`/api/orders?${params}`, { signal: controller.signal });
				clearTimeout(timeout);
				if (!response.ok) {
					console.error("Ошибка загрузки заказов: статус", response.status);
					setOrders([]);
					setTotal(0);
					return;
				}
				const data: OrderResponse = await response.json();
				if ((data as any)?.error) {
					console.error("Ошибка загрузки заказов:", (data as any).error);
					setOrders([]);
					setTotal(0);
					return;
				}

				setOrders(data.orders || []);
				setTotal(data.total || 0);
			} catch (err) {
				console.error("Ошибка загрузки заказов:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchOrders();
	}, [page, statusFilter, dateFilter, sortBy, sortOrder, managerSearch, clientSearch, departmentFilter, actionFilter, idSearch]);

	// Загрузка данных для селектов
	useEffect(() => {
		const fetchSelectData = async () => {
			try {
				// Загружаем ответственных (пользователи с ролями manager, admin, superadmin)
				const managersResponse = await fetch("/api/users?role=manager&role=admin&role=superadmin");
				if (managersResponse.ok) {
					const managersData = await managersResponse.json();
					if (managersData.users) {
						setManagers(managersData.users);
					}
				}

				// Загружаем отделы
				const departmentsResponse = await fetch("/api/departments");
				if (departmentsResponse.ok) {
					const departmentsData = await departmentsResponse.json();
					if (departmentsData.departments) {
						setDepartments(departmentsData.departments);
					}
				}

				// Загружаем клиентов (пользователи с ролью client)
				const clientsResponse = await fetch("/api/users?role=client");
				if (clientsResponse.ok) {
					const clientsData = await clientsResponse.json();
					if (clientsData.users) {
						setClients(clientsData.users);
					}
				}
			} catch (error) {
				console.error("Ошибка загрузки данных для селектов:", error);
			}
		};

		fetchSelectData();
	}, []);

	const totalPages = Math.ceil(total / limit);

	// Обработчик изменения статуса через CustomSelect
	const handleStatusChange = (value: string) => {
		setStatusFilter(value as OrderStatus | "all");
		setPage(1);
	};

	// Обработчики для поиска ответственного и клиента
	const handleManagerSearchChange = (value: string) => {
		setManagerSearch(value);
		setPage(1);
	};

	const handleClientSearchChange = (value: string) => {
		setClientSearch(value);
		setPage(1);
	};

	const handleClearManagerSearch = () => {
		setManagerSearch("");
		setPage(1);
	};

	const handleClearClientSearch = () => {
		setClientSearch("");
		setPage(1);
	};

	const handleDepartmentFilterChange = (value: string) => {
		setDepartmentFilter(value);
		setPage(1);
	};

	const handleActionFilterChange = (value: string) => {
		setActionFilter(value);
		setPage(1);
	};

	const handleIdSearchChange = (value: string) => {
		setIdSearch(value);
		setPage(1);
	};

	const handleClearIdSearch = () => {
		setIdSearch("");
		setPage(1);
	};

	// Обработчики для изменения ответственного, отдела и клиента
	const handleManagerChange = async (orderId: number, managerId: string) => {
		if (managerId === "none") {
			await unassignOrder(orderId);
		} else {
			await assignOrder(orderId, parseInt(managerId));
		}
	};

	const handleDepartmentChange = async (orderId: number, departmentId: string) => {
		// Здесь будет API для изменения отдела заказа
		console.log(`Изменение отдела заказа ${orderId} на ${departmentId}`);
	};

	const handleClientChange = async (orderId: number, clientId: string) => {
		// Здесь будет API для изменения клиента заказа
		console.log(`Изменение клиента заказа ${orderId} на ${clientId}`);
	};

	// Функция для форматирования даты
	const formatDateFromString = (dateString: string): string => {
		if (!dateString) return "дд.мм.гггг";
		const date = new Date(dateString);
		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear();
		return `${day}.${month}.${year}`;
	};

	// Обработчик изменения диапазона дат
	const handleDateRangeChange = (startDate: string, endDate: string) => {
		setDateFilter({ from: startDate, to: endDate });
		setPage(1);
	};

	// Функция для переключения активного блока
	const toggleActiveBlock = (blockKey: string) => {
		setActiveBlocks((prev) => ({
			...prev,
			[blockKey]: !prev[blockKey],
		}));
	};

	// Функция для рендеринга блока ответственного
	const renderManagerBlock = (order: Order) => {
		const managerKey = `manager_${order.id}`;
		const currentManagerId = order.manager ? order.manager.id.toString() : "none";

		return (
			<div className="fullInfoBlock">
				<div className={`clickInfoBlock ${activeBlocks[managerKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(managerKey)}>
					{order.manager ? getUserName(order.manager) : "Не назначен"}
				</div>
				<div className={`openingBlock ${activeBlocks[managerKey] ? "active" : ""}`}>
					<div className="infoField">
						<span className="title">Назначить ответственного:</span>
						<span className="value">
							<CustomSelect
								options={managerOptions}
								value={currentManagerId}
								onChange={(value) => handleManagerChange(order.id, value)}
								placeholder="Выберите ответственного"
								showSearch={true}
								searchPlaceholder="Поиск ответственного..."
								className="managerSelect"
							/>
						</span>
					</div>
					{order.manager && (
						<>
							<div className="infoField">
								<span className="title">ID:</span>
								<span className="value">{order.manager.id}</span>
							</div>
							<div className="infoField">
								<span className="title">Роль:</span>
								<span className="value">{order.manager.role || "—"}</span>
							</div>
							<div className="infoField">
								<span className="title">Профиль:</span>
								<span className="value">
									<a href={`/admin/users/${order.manager.id}`} className="itemLink">
										Перейти к профилю
									</a>
								</span>
							</div>
						</>
					)}
				</div>
			</div>
		);
	};

	// Функция для рендеринга блока отдела
	const renderDepartmentBlock = (order: Order) => {
		const departmentKey = `department_${order.id}`;
		const currentDepartmentId = order.department ? order.department.id.toString() : "none";

		return (
			<div className="fullInfoBlock">
				<div className={`clickInfoBlock ${activeBlocks[departmentKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(departmentKey)}>
					{order.department ? order.department.name : "Не выбран"}
				</div>
				<div className={`openingBlock ${activeBlocks[departmentKey] ? "active" : ""}`}>
					<div className="infoField">
						<span className="title">Выбрать отдел:</span>
						<span className="value">
							<CustomSelect
								options={departmentOptions}
								value={currentDepartmentId}
								onChange={(value) => handleDepartmentChange(order.id, value)}
								placeholder="Выберите отдел"
								className="departmentSelect"
							/>
						</span>
					</div>
					{order.department && (
						<>
							<div className="infoField">
								<span className="title">ID:</span>
								<span className="value">{order.department.id}</span>
							</div>
							<div className="infoField">
								<span className="title">Ссылка:</span>
								<span className="value">
									<a href={`/admin/departments/${order.department.id}`} className="itemLink">
										Перейти к отделу
									</a>
								</span>
							</div>
						</>
					)}
				</div>
			</div>
		);
	};

	// Функция для рендеринга блока клиента
	const renderClientBlock = (order: Order) => {
		const clientKey = `client_${order.id}`;
		const currentClientId = order.client ? order.client.id.toString() : "none";

		return (
			<div className="fullInfoBlock">
				<div className={`clickInfoBlock ${activeBlocks[clientKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(clientKey)}>
					{order.client ? getUserName(order.client) : "Не выбран"}
				</div>
				<div className={`openingBlock ${activeBlocks[clientKey] ? "active" : ""}`}>
					<div className="infoField">
						<span className="title">Выбрать клиента:</span>
						<span className="value">
							<CustomSelect
								options={clientOptions}
								value={currentClientId}
								onChange={(value) => handleClientChange(order.id, value)}
								placeholder="Выберите клиента"
								showSearch={true}
								searchPlaceholder="Поиск клиента..."
								className="clientSelect"
							/>
						</span>
					</div>
					{order.client && (
						<>
							<div className="infoField">
								<span className="title">ID:</span>
								<span className="value">{order.client.id}</span>
							</div>
							<div className="infoField">
								<span className="title">Телефон:</span>
								<span className="value">{order.client.phone || "—"}</span>
							</div>
							<div className="infoField">
								<span className="title">Профиль:</span>
								<span className="value">
									<a href={`/admin/users/${order.client.id}`} className="itemLink">
										Перейти к профилю
									</a>
								</span>
							</div>
						</>
					)}
				</div>
			</div>
		);
	};

	// Функция для рендеринга блока действий
	const renderActionsBlock = (order: Order) => {
		const actionsKey = `actions_${order.id}`;

		return (
			<div className="fullInfoBlock">
				<div className={`clickInfoBlock ${activeBlocks[actionsKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(actionsKey)}>
					Заказ #{order.id}
				</div>
				<div className={`openingBlock ${activeBlocks[actionsKey] ? "active" : ""}`}>
					<div className="infoField">
						<span className="title">Статус:</span>
						<span className="value">
							<span className={`statusBadge ${getStatusColor(order.status)}`}>{getStatusText(order.status)}</span>
						</span>
					</div>
					<div className="infoField">
						<span className="title">Просмотр:</span>
						<span className="value">
							<button className="viewButton" onClick={() => router.push(`/admin/orders/${order.id}`)}>
								Открыть заказ
							</button>
						</span>
					</div>
					<div className="infoField">
						<span className="title">Назначение:</span>
						<span className="value">
							{!order.managerId ? (
								<button
									className="assignButton"
									onClick={() => {
										// Здесь можно добавить модальное окно для выбора ответственного
										alert("Функция назначения ответственного будет добавлена");
									}}
								>
									Назначить ответственного
								</button>
							) : (
								<button className="unassignButton" onClick={() => unassignOrder(order.id)}>
									Снять назначение
								</button>
							)}
						</span>
					</div>
				</div>
			</div>
		);
	};

	// Функция для сброса всех фильтров
	const resetFilters = () => {
		setStatusFilter("all");
		setDateFilter({ from: "", to: "" });
		setShowDateFilter(false);
		setSortBy(null);
		setSortOrder(null);
		setManagerSearch("");
		setClientSearch("");
		setDepartmentFilter("all");
		setActionFilter("all");
		setIdSearch("");
		setActiveBlocks({});
		setPage(1);
	};

	// Функция для создания массива активных фильтров
	const getActiveFilters = (): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];

		if (statusFilter !== "all") {
			filters.push({
				key: "status",
				label: "Статус",
				value: getStatusText(statusFilter),
			});
		}

		if (dateFilter.from || dateFilter.to) {
			filters.push({
				key: "date",
				label: "Дата",
				value: `${dateFilter.from ? formatDateFromString(dateFilter.from) : "дд.мм.гггг"} — ${dateFilter.to ? formatDateFromString(dateFilter.to) : "дд.мм.гггг"}`,
			});
		}

		if (managerSearch && managerSearch.trim() !== "") {
			filters.push({
				key: "managerSearch",
				label: "Ответственный",
				value: managerSearch,
			});
		}

		if (clientSearch && clientSearch.trim() !== "") {
			filters.push({
				key: "clientSearch",
				label: "Клиент",
				value: clientSearch,
			});
		}

		if (departmentFilter && departmentFilter !== "all") {
			const department = departments.find((dept) => dept.id.toString() === departmentFilter);
			filters.push({
				key: "departmentFilter",
				label: "Отдел",
				value: department?.name || "Неизвестный отдел",
			});
		}

		if (actionFilter && actionFilter !== "all") {
			const action = actionOptions.find((option) => option.value === actionFilter);
			filters.push({
				key: "actionFilter",
				label: "Действие",
				value: action?.label || "Неизвестное действие",
			});
		}

		if (idSearch && idSearch.trim() !== "") {
			filters.push({
				key: "idSearch",
				label: "ID",
				value: idSearch,
			});
		}

		if (sortBy) {
			filters.push({
				key: "sort",
				label: "Сортировка",
				value: `${getSortLabel(sortBy)} ${sortOrder === "asc" ? "↑" : "↓"}`,
			});
		}

		return filters;
	};

	// Получение текста статуса
	const getStatusText = (status: OrderStatus | "all") => {
		switch (status) {
			case "created":
				return "Создан";
			case "confirmed":
				return "Подтверждён";
			case "booked":
				return "Забронирован";
			case "ready":
				return "Готов к выдаче";
			case "paid":
				return "Оплачен";
			case "completed":
				return "Выполнен";
			case "returned":
				return "Возврат";
			default:
				return status;
		}
	};

	// Получение цвета статуса
	const getStatusColor = (status: OrderStatus) => {
		switch (status) {
			case "created":
				return "statusCreated";
			case "confirmed":
				return "statusConfirmed";
			case "booked":
				return "statusBooked";
			case "ready":
				return "statusReady";
			case "paid":
				return "statusPaid";
			case "completed":
				return "statusCompleted";
			case "returned":
				return "statusReturned";
			default:
				return "statusDefault";
		}
	};

	// Получение лейбла для сортировки
	const getSortLabel = (sortBy: string) => {
		switch (sortBy) {
			case "id":
				return "ID";
			case "title":
				return "Название";
			case "status":
				return "Статус";
			case "createdAt":
				return "Дата создания";
			default:
				return sortBy;
		}
	};

	// Форматирование даты
	const formatDate = (date: string | Date) => {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		return dateObj.toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Назначение заказа ответственному
	const assignOrder = async (orderId: number, managerId: number) => {
		try {
			const response = await fetch(`/api/orders/${orderId}/assign`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ managerId }),
			});

			if (response.ok) {
				// Обновляем список заказов
				const params = new URLSearchParams({
					page: page.toString(),
					limit: limit.toString(),
				});
				if (statusFilter !== "all") params.append("status", statusFilter);
				if (dateFilter.from) params.append("dateFrom", dateFilter.from);
				if (dateFilter.to) params.append("dateTo", dateFilter.to);
				if (managerSearch) params.append("managerSearch", managerSearch);
				if (clientSearch) params.append("clientSearch", clientSearch);
				if (departmentFilter !== "all") params.append("departmentId", departmentFilter === "none" ? "null" : departmentFilter);
				if (idSearch) params.append("idSearch", idSearch);
				if (sortBy && sortOrder) {
					params.append("sortBy", sortBy);
					params.append("sortOrder", sortOrder);
				}

				const response = await fetch(`/api/orders?${params}`);
				const data: OrderResponse = await response.json();
				setOrders(data.orders || []);
				setTotal(data.total || 0);
			} else {
				const errorData = await response.json();
				console.error("Ошибка при назначении заказа:", errorData.error);
			}
		} catch (err) {
			console.error("Error assigning order:", err);
		}
	};

	// Снятие назначения с заказа
	const unassignOrder = async (orderId: number) => {
		try {
			const response = await fetch(`/api/orders/${orderId}/assign`, {
				method: "DELETE",
			});

			if (response.ok) {
				// Обновляем список заказов
				const params = new URLSearchParams({
					page: page.toString(),
					limit: limit.toString(),
				});
				if (statusFilter !== "all") params.append("status", statusFilter);
				if (dateFilter.from) params.append("dateFrom", dateFilter.from);
				if (dateFilter.to) params.append("dateTo", dateFilter.to);
				if (managerSearch) params.append("managerSearch", managerSearch);
				if (clientSearch) params.append("clientSearch", clientSearch);
				if (departmentFilter !== "all") params.append("departmentId", departmentFilter === "none" ? "null" : departmentFilter);
				if (idSearch) params.append("idSearch", idSearch);
				if (sortBy && sortOrder) {
					params.append("sortBy", sortBy);
					params.append("sortOrder", sortOrder);
				}

				const response = await fetch(`/api/orders?${params}`);
				const data: OrderResponse = await response.json();
				setOrders(data.orders || []);
				setTotal(data.total || 0);
			} else {
				const errorData = await response.json();
				console.error("Ошибка при снятии назначения:", errorData.error);
			}
		} catch (err) {
			console.error("Error unassigning order:", err);
		}
	};

	return (
		<div className={`tableContent ${styles.tableContent}`}>
			{/* Используем переиспользуемый блок фильтров без поиска */}
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetFilters} />

			<div className={styles.tableContainer}>
				<table className={styles.table}>
					<thead className={styles.tableHeader}>
						<tr>
							<th className={styles.tableHeaderCell}>
								<div className="dateFilterHeader">
									Дата создания
									<div className={`dateFilter ${dateFilter.from || dateFilter.to ? "active" : ""}`} onClick={() => setShowDateFilter(!showDateFilter)}>
										{dateFilter.from ? formatDateFromString(dateFilter.from) : "дд.мм.гггг"} —{" "}
										{dateFilter.to ? formatDateFromString(dateFilter.to) : "дд.мм.гггг"}
									</div>
									<DateRangePicker isOpen={showDateFilter} onClose={() => setShowDateFilter(false)} onDateRangeChange={handleDateRangeChange} />
								</div>
							</th>
							<th className={styles.tableHeaderCell}>
								<IdSearchField idSearch={idSearch} onSearchChange={handleIdSearchChange} onClearSearch={handleClearIdSearch} />
							</th>
							<th className={styles.tableHeaderCell}>
								<CustomSelect
									options={statusOptions}
									value={statusFilter}
									onChange={handleStatusChange}
									placeholder="Выберите статус"
									className={styles.statusSelect}
								/>
							</th>
							<th className={styles.tableHeaderCell}>
								<CustomSelect
									options={departmentOptions}
									value={departmentFilter}
									onChange={handleDepartmentFilterChange}
									placeholder="Выберите отдел"
									className={styles.departmentSelect}
								/>
							</th>
							<th className={styles.tableHeaderCell}>
								<ManagerSearchField managerSearch={managerSearch} onSearchChange={handleManagerSearchChange} onClearSearch={handleClearManagerSearch} />
							</th>
							<th className={styles.tableHeaderCell}>
								<ClientSearchField clientSearch={clientSearch} onSearchChange={handleClientSearchChange} onClearSearch={handleClearClientSearch} />
							</th>
							<th className={styles.tableHeaderCell}>
								<CustomSelect
									options={actionOptions}
									value={actionFilter}
									onChange={handleActionFilterChange}
									placeholder="Выберите действие"
									className={styles.actionSelect}
								/>
							</th>
						</tr>
					</thead>
					<tbody className={styles.tableBody}>
						{loading ? (
							<tr>
								<td colSpan={6} className={styles.loadingCell}>
									<Loading />
								</td>
							</tr>
						) : orders.length === 0 ? (
							<tr>
								<td colSpan={6} className={styles.emptyCell}>
									{statusFilter !== "all" || dateFilter.from || dateFilter.to || managerSearch || clientSearch || departmentFilter !== "all" || idSearch
										? "Заказы не найдены"
										: "Нет заказов"}
								</td>
							</tr>
						) : (
							orders.map((order) => (
								<tr key={order.id} className={styles.tableRow}>
									<td className={styles.tableCell}>{formatDate(order.createdAt)}</td>
									<td className={`${styles.tableCell} idCell`}>{order.id}</td>
									<td className={styles.tableCell}>
										<span className={`${styles.statusBadge} ${styles[getStatusColor(order.status)]}`}>{getStatusText(order.status)}</span>
									</td>
									<td className={styles.tableCell}>{renderDepartmentBlock(order)}</td>
									<td className={styles.tableCell}>{renderManagerBlock(order)}</td>
									<td className={styles.tableCell}>{renderClientBlock(order)}</td>
									<td className={styles.tableCell}>{renderActionsBlock(order)}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
				<Link href="/admin/orders/create" className={`createButton`}>
					+ Создать заказ
				</Link>
			</div>

			{/* Используем компонент Pagination вместо встроенной пагинации */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.ordersPagination} />
		</div>
	);
}
