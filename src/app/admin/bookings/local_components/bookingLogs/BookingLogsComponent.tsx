"use client";

import styles from "../../../departments/local_components/styles.module.scss";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { useState, useCallback, useMemo } from "react";
import React from "react";
import AllBookingsLogsTable from "../allBookingsLogs/AllBookingsLogsTable";

// Отдельный компонент для поля поиска администратора
const AdminSearchField = React.memo(
	({ adminSearch, onSearchChange, onClearSearch }: { adminSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Кем выполнено:
			<div className="searchInput">
				<input type="text" value={adminSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="ID, телефон или ФИО администратора" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
);
AdminSearchField.displayName = "AdminSearchField";

// Отдельный компонент для фильтра даты
const DateFilterField = React.memo(
	({
		startDate,
		endDate,
		showDateFilter,
		onToggleFilter,
		onCloseFilter,
		onDateRangeChange,
		formatDateFromString,
	}: {
		startDate: string;
		endDate: string;
		showDateFilter: boolean;
		onToggleFilter: () => void;
		onCloseFilter: () => void;
		onDateRangeChange: (startDate: string, endDate: string) => void;
		formatDateFromString: (date: string) => string;
	}) => (
		<div className="dateFilterHeader">
			Дата
			<div className={`dateFilter ${showDateFilter ? "active" : ""}`} onClick={onToggleFilter}>
				{startDate ? formatDateFromString(startDate) : "дд.мм.гггг"} — {endDate ? formatDateFromString(endDate) : "дд.мм.гггг"}
			</div>
			<DateRangePicker isOpen={showDateFilter} onClose={onCloseFilter} onDateRangeChange={onDateRangeChange} />
		</div>
	)
);
DateFilterField.displayName = "DateFilterField";

type BookingLogsComponentProps = {
	bookingId: number; // ID записи для фильтрации логов
};

export default function BookingLogsComponent({ bookingId }: BookingLogsComponentProps) {
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [actionFilter, setActionFilter] = useState<string | null>(null);

	// Состояния для фильтрации по дате
	const [showDateFilter, setShowDateFilter] = useState(false);
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [isDateFiltered, setIsDateFiltered] = useState(false);

	// Состояние для поиска по администратору
	const [adminSearch, setAdminSearch] = useState<string>("");

	const { user } = useAuthStore();

	// Мемоизируем параметры запроса для предотвращения лишних запросов
	// Всегда добавляем bookingId для фильтрации логов конкретной записи
	const queryParams = useMemo(() => {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: "20",
			bookingId: bookingId.toString(), // Фильтруем по конкретной записи
		});

		if (actionFilter) {
			params.append("action", actionFilter);
		}

		// Добавляем параметры фильтрации по дате
		if (startDate && startDate.trim() !== "") {
			params.append("dateFrom", startDate);
		}

		if (endDate && endDate.trim() !== "") {
			params.append("dateTo", endDate);
		}

		return params;
	}, [page, actionFilter, startDate, endDate, bookingId]);

	// Обработчик обновления логов из таблицы
	const handleLogsUpdate = useCallback((totalCount: number, totalPages: number) => {
		setTotalCount(totalCount);
		setTotalPages(totalPages);
	}, []);

	// Обработчик изменения фильтра действия
	const handleActionFilterChange = useCallback((value: string | null) => {
		setActionFilter(value);
		setPage(1); // Сбрасываем страницу при изменении фильтра
	}, []);

	// Обработчик изменения диапазона дат
	const handleDateRangeChange = useCallback(
		(start: string, end: string) => {
			setStartDate(start);
			setEndDate(end);
			setIsDateFiltered(!!(start || end));
			setPage(1); // Сбрасываем страницу при изменении фильтра
		},
		[]
	);

	// Обработчик закрытия фильтра даты
	const handleCloseDateFilter = useCallback(() => {
		setShowDateFilter(false);
	}, []);

	// Обработчик переключения фильтра даты
	const handleToggleDateFilter = useCallback(() => {
		setShowDateFilter((prev) => !prev);
	}, []);

	// Обработчик очистки поиска администратора
	const handleClearAdminSearch = useCallback(() => {
		setAdminSearch("");
	}, []);

	// Функция форматирования даты из строки
	const formatDateFromString = useCallback((dateString: string) => {
		const date = new Date(dateString);
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = date.getFullYear();
		return `${day}.${month}.${year}`;
	}, []);

	// Получаем активные фильтры для отображения
	const getActiveFilters = useCallback((): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];

		if (actionFilter) {
			const actionLabels: Record<string, string> = {
				create: "Создание",
				update: "Обновление",
				assign: "Назначение менеджера",
				unassign: "Снятие менеджера",
				status_change: "Изменение статуса",
				cancel: "Отмена",
			};
			filters.push({
				key: "action",
				label: "Действие",
				value: actionLabels[actionFilter] || actionFilter,
			});
		}

		if (isDateFiltered && (startDate || endDate)) {
			filters.push({
				key: "date",
				label: "Дата",
				value: `${startDate ? formatDateFromString(startDate) : "дд.мм.гггг"} — ${endDate ? formatDateFromString(endDate) : "дд.мм.гггг"}`,
			});
		}

		if (adminSearch && adminSearch.trim() !== "") {
			filters.push({
				key: "adminSearch",
				label: "Кем выполнено",
				value: adminSearch,
			});
		}

		return filters;
	}, [actionFilter, isDateFiltered, startDate, endDate, adminSearch, formatDateFromString]);

	// Обработчик сброса всех фильтров
	const resetAllFilters = useCallback(() => {
		setActionFilter(null);
		setStartDate("");
		setEndDate("");
		setIsDateFiltered(false);
		setAdminSearch("");
		setPage(1);
	}, []);

	// Заголовки таблицы
	const tableHeaders = [
		{ label: "Дата и время", key: "createdAt" },
		{ label: "Действие", key: "action" },
		{ label: "Сообщение", key: "message" },
		{ label: "Кем выполнено", key: "admin" },
	];

	return (
		<div className={`tableContent`}>
			{/* Используем переиспользуемый блок фильтров */}
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetAllFilters} />

			{/* Фильтры */}
			<div className={`filtersContainer`}>
				<CustomSelect
					options={[
						{ value: "", label: "Все действия" },
						{ value: "create", label: "Создание" },
						{ value: "update", label: "Обновление" },
						{ value: "assign", label: "Назначение менеджера" },
						{ value: "unassign", label: "Снятие менеджера" },
						{ value: "status_change", label: "Изменение статуса" },
						{ value: "cancel", label: "Отмена" },
					]}
					value={actionFilter || ""}
					onChange={(value) => handleActionFilterChange(value || null)}
					placeholder="Фильтр по действию"
				/>

				<DateFilterField
					startDate={startDate}
					endDate={endDate}
					showDateFilter={showDateFilter}
					onToggleFilter={handleToggleDateFilter}
					onCloseFilter={handleCloseDateFilter}
					onDateRangeChange={handleDateRangeChange}
					formatDateFromString={formatDateFromString}
				/>

				<AdminSearchField adminSearch={adminSearch} onSearchChange={setAdminSearch} onClearSearch={handleClearAdminSearch} />
			</div>

			<AllBookingsLogsTable tableHeaders={tableHeaders} queryParams={queryParams} onLogsUpdate={handleLogsUpdate} adminSearch={adminSearch} />

			{/* Пагинация */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.logsPagination} />
		</div>
	);
}
