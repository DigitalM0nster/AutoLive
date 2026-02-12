"use client";

import styles from "@/app/admin/departments/local_components/styles.module.scss";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter } from "@/lib/types";
import { useState, useCallback, useMemo } from "react";
import React from "react";
import AllBookingDepartmentsLogsTable from "./AllBookingDepartmentsLogsTable";

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

// Отдельный компонент для поля поиска адреса
const TargetBookingDepartmentSearchField = React.memo(
	({ targetBookingDepartmentSearch, onSearchChange, onClearSearch }: { targetBookingDepartmentSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Адрес:
			<div className="searchInput">
				<input type="text" value={targetBookingDepartmentSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Введите ID адреса" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
);
TargetBookingDepartmentSearchField.displayName = "TargetBookingDepartmentSearchField";

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

export default function AllBookingDepartmentsLogsComponent() {
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [actionFilter, setActionFilter] = useState<string | null>(null);

	// Состояния для фильтрации по дате
	const [showDateFilter, setShowDateFilter] = useState(false);
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [isDateFiltered, setIsDateFiltered] = useState(false);

	// Состояния для поиска по администратору и адресу
	const [adminSearch, setAdminSearch] = useState<string>("");
	const [targetBookingDepartmentSearch, setTargetBookingDepartmentSearch] = useState<string>("");

	// Мемоизируем параметры запроса для предотвращения лишних запросов
	const queryParams = useMemo(() => {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: "20",
		});

		if (actionFilter) {
			params.append("action", actionFilter);
		}

		// Добавляем параметры фильтрации по дате (API использует dateFrom/dateTo, а не startDate/endDate)
		if (startDate && startDate.trim() !== "") {
			params.append("dateFrom", startDate);
		}

		if (endDate && endDate.trim() !== "") {
			params.append("dateTo", endDate);
		}

		// Добавляем поиск по ID адреса
		if (targetBookingDepartmentSearch && targetBookingDepartmentSearch.trim() !== "") {
			params.append("bookingDepartmentId", targetBookingDepartmentSearch.trim());
		}

		return params;
	}, [page, actionFilter, startDate, endDate, targetBookingDepartmentSearch]);

	// Функция для форматирования даты из строки YYYY-MM-DD в DD.MM.YYYY
	const formatDateFromString = useCallback((dateString: string): string => {
		if (!dateString) return "";

		const date = new Date(dateString);
		if (isNaN(date.getTime())) return "";

		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear();

		return `${day}.${month}.${year}`;
	}, []);

	// Мемоизируем опции для селекта действий
	const actionOptions = useMemo(
		() => [
			{ value: "all", label: "Все действия" },
			{ value: "create", label: "Создание" },
			{ value: "update", label: "Редактирование" },
			{ value: "delete", label: "Удаление" },
		],
		[]
	);

	// Функция для создания массива активных фильтров
	const getActiveFilters = useCallback((): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];

		// Добавляем фильтр по действию
		if (actionFilter) {
			const actionLabel = actionOptions.find((option) => option.value === actionFilter)?.label || actionFilter;
			filters.push({
				key: "action",
				label: "Действие",
				value: actionLabel,
			});
		}

		// Исправляем логику проверки фильтрации по дате
		if (startDate?.trim() || endDate?.trim()) {
			filters.push({
				key: "date",
				label: "Дата",
				value: `${startDate ? formatDateFromString(startDate) : "дд.мм.гггг"} — ${endDate ? formatDateFromString(endDate) : "дд.мм.гггг"}`,
			});
		}

		if (adminSearch && adminSearch.trim() !== "") {
			filters.push({
				key: "adminSearch",
				label: "Кто изменил",
				value: adminSearch,
			});
		}

		if (targetBookingDepartmentSearch && targetBookingDepartmentSearch.trim() !== "") {
			filters.push({
				key: "targetBookingDepartmentSearch",
				label: "Адрес",
				value: targetBookingDepartmentSearch,
			});
		}

		return filters;
	}, [actionFilter, actionOptions, startDate, endDate, adminSearch, targetBookingDepartmentSearch, formatDateFromString]);

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
	const resetAllFilters = useCallback(() => {
		setActionFilter(null);
		setStartDate("");
		setEndDate("");
		setIsDateFiltered(false);
		setAdminSearch("");
		setTargetBookingDepartmentSearch("");
		setPage(1);
	}, []);

	// Обработчики для полей поиска
	const handleAdminSearchChange = useCallback((value: string) => {
		setAdminSearch(value);
		setPage(1);
	}, []);

	const handleTargetBookingDepartmentSearchChange = useCallback((value: string) => {
		setTargetBookingDepartmentSearch(value);
		setPage(1);
	}, []);

	// Обработчики для очистки поиска
	const handleClearAdminSearch = useCallback(() => {
		setAdminSearch("");
		setPage(1);
	}, []);

	const handleClearTargetBookingDepartmentSearch = useCallback(() => {
		setTargetBookingDepartmentSearch("");
		setPage(1);
	}, []);

	// Мемоизируем обработчик изменения действия
	const handleActionChange = useCallback((value: string) => {
		setActionFilter(value === "all" ? null : value);
		setPage(1); // Сбрасываем страницу при изменении фильтра
	}, []);

	// Обработчик обновления данных логов
	const handleLogsUpdate = useCallback((totalCount: number, totalPages: number) => {
		setTotalPages(totalPages);
	}, []);

	// Мемоизируем заголовки таблицы для предотвращения ререндеров
	const tableHeaders = useMemo(
		() => (
			<tr>
				<th className={styles.tableHeaderCell}>
					<DateFilterField
						startDate={startDate}
						endDate={endDate}
						showDateFilter={showDateFilter}
						onToggleFilter={() => setShowDateFilter(!showDateFilter)}
						onCloseFilter={() => setShowDateFilter(false)}
						onDateRangeChange={handleDateRangeChange}
						formatDateFromString={formatDateFromString}
					/>
				</th>
				<th className={styles.tableHeaderCell}>
					<AdminSearchField adminSearch={adminSearch} onSearchChange={handleAdminSearchChange} onClearSearch={handleClearAdminSearch} />
				</th>
				<th className={styles.tableHeaderCell}>
					<TargetBookingDepartmentSearchField
						targetBookingDepartmentSearch={targetBookingDepartmentSearch}
						onSearchChange={handleTargetBookingDepartmentSearchChange}
						onClearSearch={handleClearTargetBookingDepartmentSearch}
					/>
				</th>
				<th className={styles.tableHeaderCell}>
					<CustomSelect
						options={actionOptions}
						value={actionFilter || "all"}
						onChange={handleActionChange}
						placeholder="Выберите действие"
						className={styles.actionSelect}
					/>
				</th>
			</tr>
		),
		[
			startDate,
			endDate,
			showDateFilter,
			formatDateFromString,
			handleDateRangeChange,
			adminSearch,
			handleAdminSearchChange,
			handleClearAdminSearch,
			targetBookingDepartmentSearch,
			handleTargetBookingDepartmentSearchChange,
			handleClearTargetBookingDepartmentSearch,
			actionOptions,
			actionFilter,
			handleActionChange,
		]
	);

	return (
		<div className={`tableContent`}>
			{/* Используем переиспользуемый блок фильтров */}
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetAllFilters} />

			<AllBookingDepartmentsLogsTable tableHeaders={tableHeaders} queryParams={queryParams} onLogsUpdate={handleLogsUpdate} adminSearch={adminSearch} />

			{/* Пагинация */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.logsPagination} />
		</div>
	);
}
