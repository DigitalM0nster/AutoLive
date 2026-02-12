"use client";

import React, { useCallback, useMemo, useState } from "react";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter } from "@/lib/types";
import BookingDepartmentLogsTable from "./BookingDepartmentLogsTable";
import styles from "@/app/admin/departments/local_components/styles.module.scss";

// Поле поиска по администратору
const AdminSearchField = React.memo(
	({ adminSearch, onSearchChange, onClearSearch }: { adminSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Кем выполнено:
			<div className="searchInput">
				<input type="text" value={adminSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="ID, телефон или ФИО" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	),
);
AdminSearchField.displayName = "AdminSearchField";

// Фильтр по дате
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
	),
);
DateFilterField.displayName = "DateFilterField";

type Props = {
	/** ID адреса для фильтрации логов конкретного адреса */
	bookingDepartmentId: number;
};

export default function BookingDepartmentLogsComponent({ bookingDepartmentId }: Props) {
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [actionFilter, setActionFilter] = useState<string | null>(null);

	const [showDateFilter, setShowDateFilter] = useState(false);
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [adminSearch, setAdminSearch] = useState<string>("");

	const queryParams = useMemo(() => {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: "20",
			bookingDepartmentId: bookingDepartmentId.toString(), // Фильтруем по конкретному адресу
		});
		if (actionFilter) params.append("action", actionFilter);
		if (startDate?.trim()) params.append("dateFrom", startDate);
		if (endDate?.trim()) params.append("dateTo", endDate);
		return params;
	}, [page, actionFilter, startDate, endDate, bookingDepartmentId]);

	const formatDateFromString = useCallback((dateString: string): string => {
		if (!dateString) return "";
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return "";
		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear();
		return `${day}.${month}.${year}`;
	}, []);

	const actionOptions = useMemo(
		() => [
			{ value: "all", label: "Все действия" },
			{ value: "create", label: "Создание" },
			{ value: "update", label: "Редактирование" },
			{ value: "delete", label: "Удаление" },
		],
		[],
	);

	const getActiveFilters = useCallback((): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];
		if (actionFilter) {
			const label = actionOptions.find((o) => o.value === actionFilter)?.label || actionFilter;
			filters.push({ key: "action", label: "Действие", value: label });
		}
		if (startDate?.trim() || endDate?.trim()) {
			filters.push({
				key: "date",
				label: "Дата",
				value: `${startDate ? formatDateFromString(startDate) : "дд.мм.гггг"} — ${endDate ? formatDateFromString(endDate) : "дд.мм.гггг"}`,
			});
		}
		if (adminSearch?.trim()) {
			filters.push({ key: "adminSearch", label: "Кто изменил", value: adminSearch });
		}
		return filters;
	}, [actionFilter, actionOptions, startDate, endDate, adminSearch, formatDateFromString]);

	const handleDateRangeChange = useCallback((start: string, end: string) => {
		setStartDate(start);
		setEndDate(end);
		setPage(1);
	}, []);

	const resetAllFilters = useCallback(() => {
		setActionFilter(null);
		setStartDate("");
		setEndDate("");
		setAdminSearch("");
		setPage(1);
	}, []);

	const handleAdminSearchChange = useCallback((value: string) => {
		setAdminSearch(value);
		setPage(1);
	}, []);

	const handleClearAdminSearch = useCallback(() => {
		setAdminSearch("");
		setPage(1);
	}, []);

	const handleActionChange = useCallback((value: string | null) => {
		setActionFilter(value === "all" || value === null ? null : value);
		setPage(1);
	}, []);

	const getRecordsText = useCallback((count: number) => {
		const n = count % 100;
		if (n >= 11 && n <= 19) return `${count} записей`;
		switch (count % 10) {
			case 1:
				return `${count} запись`;
			case 2:
			case 3:
			case 4:
				return `${count} записи`;
			default:
				return `${count} записей`;
		}
	}, []);

	const handleLogsUpdate = useCallback((totalCount: number, totalPages: number) => {
		setTotalCount(totalCount);
		setTotalPages(totalPages);
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
						{ value: "update", label: "Редактирование" },
						{ value: "delete", label: "Удаление" },
					]}
					value={actionFilter || ""}
					onChange={(value) => handleActionChange(value === "" ? null : value)}
					placeholder="Фильтр по действию"
				/>

				<DateFilterField
					startDate={startDate}
					endDate={endDate}
					showDateFilter={showDateFilter}
					onToggleFilter={() => setShowDateFilter((v) => !v)}
					onCloseFilter={() => setShowDateFilter(false)}
					onDateRangeChange={handleDateRangeChange}
					formatDateFromString={formatDateFromString}
				/>

				<AdminSearchField adminSearch={adminSearch} onSearchChange={handleAdminSearchChange} onClearSearch={handleClearAdminSearch} />
			</div>

			<BookingDepartmentLogsTable
				tableHeaders={tableHeaders}
				queryParams={queryParams}
				onLogsUpdate={handleLogsUpdate}
				adminSearch={adminSearch}
				bookingDepartmentId={bookingDepartmentId}
			/>

			{/* Пагинация */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.logsPagination} />
		</div>
	);
}
