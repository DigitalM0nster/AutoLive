"use client";

import React, { useEffect, useState } from "react";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import { Booking, BookingResponse, BookingStatus, ActiveFilter } from "@/lib/types";
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
			<input type="text" value={idSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Введите ID записи" />
			<div onClick={onClearSearch} className="clearSearchButton"></div>
		</div>
	</div>
));
IdSearchField.displayName = "IdSearchField";

export default function AllBookingsTable() {
	const router = useRouter();
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");

	// Состояние для поиска
	const [managerSearch, setManagerSearch] = useState("");
	const [clientSearch, setClientSearch] = useState("");
	const [departmentFilter, setDepartmentFilter] = useState<"all" | string>("all");
	const [idSearch, setIdSearch] = useState("");

	// Состояние для сортировки
	const [sortBy, setSortBy] = useState<"id" | "scheduledDate" | "scheduledTime" | "status" | null>(null);
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

	const limit = 20;

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
		{ value: "scheduled", label: "Запланирована" },
		{ value: "confirmed", label: "Подтверждена" },
		{ value: "completed", label: "Выполнена" },
		{ value: "cancelled", label: "Отменена" },
		{ value: "no_show", label: "Не явился" },
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

	// Загрузка записей
	useEffect(() => {
		const fetchBookings = async () => {
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

				const response = await fetch(`/api/bookings?${params}`);
				const data: BookingResponse = await response.json();

				if (data.error) {
					console.error("Ошибка загрузки записей:", data.error);
					return;
				}

				setBookings(data.bookings || []);
				setTotal(data.total || 0);
			} catch (err) {
				console.error("Ошибка загрузки записей:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchBookings();
	}, [page, statusFilter, dateFilter, sortBy, sortOrder, managerSearch, clientSearch, departmentFilter, idSearch]);

	// Загрузка данных для селектов
	useEffect(() => {
		const fetchSelectData = async () => {
			try {
				// Загружаем ответственных (пользователи с ролями manager, admin, superadmin)
				const managersResponse = await fetch("/api/users?role=manager&role=admin&role=superadmin");
				const managersData = await managersResponse.json();
				if (managersData.users) {
					setManagers(managersData.users);
				}

				// Загружаем отделы
				const departmentsResponse = await fetch("/api/departments");
				const departmentsData = await departmentsResponse.json();
				if (departmentsData.departments) {
					setDepartments(departmentsData.departments);
				}

				// Загружаем клиентов (пользователи с ролью client)
				const clientsResponse = await fetch("/api/users?role=client");
				const clientsData = await clientsResponse.json();
				if (clientsData.users) {
					setClients(clientsData.users);
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
		setStatusFilter(value as BookingStatus | "all");
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

	const handleIdSearchChange = (value: string) => {
		setIdSearch(value);
		setPage(1);
	};

	const handleClearIdSearch = () => {
		setIdSearch("");
		setPage(1);
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
	const renderManagerBlock = (booking: Booking) => {
		const managerKey = `manager_${booking.id}`;

		return (
			<div className="fullInfoBlock">
				<div className={`clickInfoBlock ${activeBlocks[managerKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(managerKey)}>
					{getUserName(booking.manager)}
				</div>
				<div className={`openingBlock ${activeBlocks[managerKey] ? "active" : ""}`}>
					<div className="infoField">
						<span className="title">ID:</span>
						<span className="value">{booking.manager.id}</span>
					</div>
					<div className="infoField">
						<span className="title">Роль:</span>
						<span className="value">{booking.manager.role || "—"}</span>
					</div>
					<div className="infoField">
						<span className="title">Отдел:</span>
						<span className="value">{booking.manager.department?.name || "—"}</span>
					</div>
					<div className="infoField">
						<span className="title">Профиль:</span>
						<span className="value">
							<a href={`/admin/users/${booking.manager.id}`} className="itemLink">
								Перейти к профилю
							</a>
						</span>
					</div>
				</div>
			</div>
		);
	};

	// Функция для рендеринга блока клиента
	const renderClientBlock = (booking: Booking) => {
		const clientKey = `client_${booking.id}`;

		return (
			<div className="fullInfoBlock">
				<div className={`clickInfoBlock ${activeBlocks[clientKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(clientKey)}>
					{booking.client ? getUserName(booking.client) : "Не выбран"}
				</div>
				<div className={`openingBlock ${activeBlocks[clientKey] ? "active" : ""}`}>
					{booking.client ? (
						<>
							<div className="infoField">
								<span className="title">ID:</span>
								<span className="value">{booking.client.id}</span>
							</div>
							<div className="infoField">
								<span className="title">Телефон:</span>
								<span className="value">{booking.client.phone || "—"}</span>
							</div>
							<div className="infoField">
								<span className="title">Профиль:</span>
								<span className="value">
									<a href={`/admin/users/${booking.client.id}`} className="itemLink">
										Перейти к профилю
									</a>
								</span>
							</div>
						</>
					) : (
						<div className="infoField">
							<span className="title">Статус:</span>
							<span className="value">Клиент не зарегистрирован</span>
						</div>
					)}
				</div>
			</div>
		);
	};

	// Функция для рендеринга блока действий
	const renderActionsBlock = (booking: Booking) => {
		const actionsKey = `actions_${booking.id}`;

		return (
			<div className="fullInfoBlock">
				<div className={`clickInfoBlock ${activeBlocks[actionsKey] ? "active" : ""}`} onClick={() => toggleActiveBlock(actionsKey)}>
					Запись #{booking.id}
				</div>
				<div className={`openingBlock ${activeBlocks[actionsKey] ? "active" : ""}`}>
					<div className="infoField">
						<span className="title">Дата:</span>
						<span className="value">{formatDateFromString(booking.scheduledDate.toString())}</span>
					</div>
					<div className="infoField">
						<span className="title">Время:</span>
						<span className="value">{booking.scheduledTime}</span>
					</div>
					<div className="infoField">
						<span className="title">Статус:</span>
						<span className="value">
							<span className={`statusBadge ${getStatusColor(booking.status)}`}>{getStatusText(booking.status)}</span>
						</span>
					</div>
					<div className="infoField">
						<span className="title">Просмотр:</span>
						<span className="value">
							<button className="viewButton" onClick={() => router.push(`/admin/bookings/${booking.id}`)}>
								Открыть запись
							</button>
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
	const getStatusText = (status: BookingStatus | "all") => {
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
	};

	// Получение цвета статуса
	const getStatusColor = (status: BookingStatus) => {
		switch (status) {
			case "scheduled":
				return "statusCreated";
			case "confirmed":
				return "statusConfirmed";
			case "completed":
				return "statusCompleted";
			case "cancelled":
				return "statusCancelled";
			case "no_show":
				return "statusNoShow";
			default:
				return "statusDefault";
		}
	};

	// Получение лейбла для сортировки
	const getSortLabel = (sortBy: string) => {
		switch (sortBy) {
			case "id":
				return "ID";
			case "scheduledDate":
				return "Дата записи";
			case "scheduledTime":
				return "Время записи";
			case "status":
				return "Статус";
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
		});
	};

	return (
		<div className="tableContent">
			{/* Используем переиспользуемый блок фильтров без поиска */}
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetFilters} />

			<div className="tableContainer">
				<table className="table">
					<thead className="tableHeader">
						<tr>
							<th className="tableHeaderCell">
								<div className="dateFilterHeader">
									Дата записи
									<div className={`dateFilter ${dateFilter.from || dateFilter.to ? "active" : ""}`} onClick={() => setShowDateFilter(!showDateFilter)}>
										{dateFilter.from ? formatDateFromString(dateFilter.from) : "дд.мм.гггг"} —{" "}
										{dateFilter.to ? formatDateFromString(dateFilter.to) : "дд.мм.гггг"}
									</div>
									<DateRangePicker isOpen={showDateFilter} onClose={() => setShowDateFilter(false)} onDateRangeChange={handleDateRangeChange} />
								</div>
							</th>
							<th className="tableHeaderCell">
								<IdSearchField idSearch={idSearch} onSearchChange={handleIdSearchChange} onClearSearch={handleClearIdSearch} />
							</th>
							<th className="tableHeaderCell">
								<CustomSelect options={statusOptions} value={statusFilter} onChange={handleStatusChange} placeholder="Выберите статус" className="statusSelect" />
							</th>
							<th className="tableHeaderCell">
								<CustomSelect
									options={departmentOptions}
									value={departmentFilter}
									onChange={handleDepartmentFilterChange}
									placeholder="Выберите отдел"
									className="departmentSelect"
								/>
							</th>
							<th className="tableHeaderCell">
								<ManagerSearchField managerSearch={managerSearch} onSearchChange={handleManagerSearchChange} onClearSearch={handleClearManagerSearch} />
							</th>
							<th className="tableHeaderCell">
								<ClientSearchField clientSearch={clientSearch} onSearchChange={handleClientSearchChange} onClearSearch={handleClearClientSearch} />
							</th>
							<th className="tableHeaderCell">Действия</th>
						</tr>
					</thead>
					<tbody className="tableBody">
						{loading ? (
							<tr>
								<td colSpan={7} className="loadingCell">
									<Loading />
								</td>
							</tr>
						) : bookings.length === 0 ? (
							<tr>
								<td colSpan={7} className="emptyCell">
									{statusFilter !== "all" || dateFilter.from || dateFilter.to || managerSearch || clientSearch || departmentFilter !== "all" || idSearch
										? "Записи не найдены"
										: "Нет записей"}
								</td>
							</tr>
						) : (
							bookings.map((booking) => (
								<tr key={booking.id} className="tableRow">
									<td className="tableCell">
										{formatDate(booking.scheduledDate)} {booking.scheduledTime}
									</td>
									<td className="tableCell idCell">{booking.id}</td>
									<td className="tableCell">
										<span className={`statusBadge ${getStatusColor(booking.status)}`}>{getStatusText(booking.status)}</span>
									</td>
									<td className="tableCell">{booking.manager.department?.name || "—"}</td>
									<td className="tableCell">{renderManagerBlock(booking)}</td>
									<td className="tableCell">{renderClientBlock(booking)}</td>
									<td className="tableCell">{renderActionsBlock(booking)}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
				<Link href="/admin/bookings/create" className="createButton">
					+ Создать запись
				</Link>
			</div>

			{/* Используем компонент Pagination вместо встроенной пагинации */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className="bookingsPagination" />
		</div>
	);
}
