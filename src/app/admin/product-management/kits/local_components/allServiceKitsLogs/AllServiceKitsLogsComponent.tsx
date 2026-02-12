"use client";

import styles from "@/app/admin/departments/local_components/styles.module.scss";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { useState, useCallback, useMemo } from "react";
import React from "react";
import AllServiceKitsLogsTable from "./AllServiceKitsLogsTable";

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

// Отдельный компонент для поля поиска комплекта
const TargetServiceKitSearchField = React.memo(
	({ targetServiceKitSearch, onSearchChange, onClearSearch }: { targetServiceKitSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Комплект ТО:
			<div className="searchInput">
				<input type="text" value={targetServiceKitSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Введите ID комплекта ТО" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
);
TargetServiceKitSearchField.displayName = "TargetServiceKitSearchField";

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

export default function AllServiceKitsLogsComponent() {
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [actionFilter, setActionFilter] = useState<string | null>(null);

	// Состояния для фильтрации по дате
	const [showDateFilter, setShowDateFilter] = useState(false);
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [isDateFiltered, setIsDateFiltered] = useState(false);

	// Состояния для поиска по администратору и комплекту
	const [adminSearch, setAdminSearch] = useState<string>("");
	const [targetServiceKitSearch, setTargetServiceKitSearch] = useState<string>("");

	const [clearingLogs, setClearingLogs] = useState(false);

	const { user } = useAuthStore();

	// Мемоизируем параметры запроса для предотвращения лишних запросов
	const queryParams = useMemo(() => {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: "20",
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

		// Добавляем поиск по ID комплекта ТО
		if (targetServiceKitSearch && targetServiceKitSearch.trim() !== "") {
			params.append("serviceKitId", targetServiceKitSearch.trim());
		}

		return params;
	}, [page, actionFilter, startDate, endDate, targetServiceKitSearch]);

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

		if (actionFilter && actionFilter !== "all") {
			const actionOption = actionOptions.find((opt) => opt.value === actionFilter);
			filters.push({
				key: "action",
				label: "Действие",
				value: actionOption?.label || actionFilter,
			});
		}

		if (startDate || endDate) {
			filters.push({
				key: "date",
				label: "Дата",
				value: `${startDate ? formatDateFromString(startDate) : "дд.мм.гггг"} — ${endDate ? formatDateFromString(endDate) : "дд.мм.гггг"}`,
			});
		}

		if (targetServiceKitSearch && targetServiceKitSearch.trim() !== "") {
			filters.push({
				key: "serviceKit",
				label: "Комплект ТО",
				value: targetServiceKitSearch,
			});
		}

		if (adminSearch && adminSearch.trim() !== "") {
			filters.push({
				key: "admin",
				label: "Администратор",
				value: adminSearch,
			});
		}

		return filters;
	}, [actionFilter, actionOptions, startDate, endDate, targetServiceKitSearch, adminSearch, formatDateFromString]);

	// Обработчики изменения фильтров
	const handleDateRangeChange = useCallback((start: string, end: string) => {
		setStartDate(start);
		setEndDate(end);
		setIsDateFiltered(!!start || !!end);
		setShowDateFilter(false);
		setPage(1);
	}, []);

	const handleActionFilterChange = useCallback((value: string) => {
		setActionFilter(value === "all" ? null : value);
		setPage(1);
	}, []);

	const handleAdminSearchChange = useCallback((value: string) => {
		setAdminSearch(value);
		setPage(1);
	}, []);

	const handleTargetServiceKitSearchChange = useCallback((value: string) => {
		setTargetServiceKitSearch(value);
		setPage(1);
	}, []);

	const handleClearAdminSearch = useCallback(() => {
		setAdminSearch("");
		setPage(1);
	}, []);

	const handleClearTargetServiceKitSearch = useCallback(() => {
		setTargetServiceKitSearch("");
		setPage(1);
	}, []);

	const handleToggleDateFilter = useCallback(() => {
		setShowDateFilter((prev) => !prev);
	}, []);

	const handleCloseDateFilter = useCallback(() => {
		setShowDateFilter(false);
	}, []);

	const handleLogsUpdate = useCallback((totalCount: number, totalPages: number) => {
		setTotalCount(totalCount);
		setTotalPages(totalPages);
	}, []);

	// Функция для сброса всех фильтров
	const resetAllFilters = useCallback(() => {
		setActionFilter(null);
		setStartDate("");
		setEndDate("");
		setIsDateFiltered(false);
		setAdminSearch("");
		setTargetServiceKitSearch("");
		setPage(1);
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
						onToggleFilter={handleToggleDateFilter}
						onCloseFilter={handleCloseDateFilter}
						onDateRangeChange={handleDateRangeChange}
						formatDateFromString={formatDateFromString}
					/>
				</th>
				<th className={styles.tableHeaderCell}>
					<CustomSelect
						options={actionOptions}
						value={actionFilter || "all"}
						onChange={handleActionFilterChange}
						placeholder="Выберите действие"
						className={styles.actionSelect}
					/>
				</th>
				<th className={styles.tableHeaderCell}>
					<AdminSearchField adminSearch={adminSearch} onSearchChange={handleAdminSearchChange} onClearSearch={handleClearAdminSearch} />
				</th>
				<th className={styles.tableHeaderCell}>
					<TargetServiceKitSearchField
						targetServiceKitSearch={targetServiceKitSearch}
						onSearchChange={handleTargetServiceKitSearchChange}
						onClearSearch={handleClearTargetServiceKitSearch}
					/>
				</th>
				<th className={styles.tableHeaderCell}>Сообщение</th>
			</tr>
		),
		[
			startDate,
			endDate,
			showDateFilter,
			formatDateFromString,
			handleToggleDateFilter,
			handleCloseDateFilter,
			handleDateRangeChange,
			actionOptions,
			actionFilter,
			handleActionFilterChange,
			adminSearch,
			handleAdminSearchChange,
			handleClearAdminSearch,
			targetServiceKitSearch,
			handleTargetServiceKitSearchChange,
			handleClearTargetServiceKitSearch,
		]
	);

	const activeFilters = getActiveFilters();

	return (
		<div className={styles.tableWrapper}>
			<FiltersBlock activeFilters={activeFilters} onResetFilters={resetAllFilters} />
			<AllServiceKitsLogsTable tableHeaders={tableHeaders} queryParams={queryParams} onLogsUpdate={handleLogsUpdate} adminSearch={adminSearch} />
			{totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
		</div>
	);
}
