"use client";

import React, { useCallback, useMemo, useState } from "react";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter } from "@/lib/types";
import CategoryLogsTable from "./CategoryLogsTable";
import styles from "../styles.module.scss";

// Поле поиска по администратору
const AdminSearchField = React.memo(
	({
		adminSearch,
		onSearchChange,
		onClearSearch,
	}: {
		adminSearch: string;
		onSearchChange: (value: string) => void;
		onClearSearch: () => void;
	}) => (
		<div className="searchFilterHeader">
			Кем выполнено:
			<div className="searchInput">
				<input
					type="text"
					value={adminSearch}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="ID, телефон или ФИО"
				/>
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
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
	)
);
DateFilterField.displayName = "DateFilterField";

type Props = {
	/** Если передан — логи одной категории, иначе все логи категорий */
	categoryId?: number;
};

export default function CategoryLogsComponent({ categoryId }: Props) {
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
		});
		if (actionFilter) params.append("action", actionFilter);
		if (startDate?.trim()) params.append("startDate", startDate);
		if (endDate?.trim()) params.append("endDate", endDate);
		if (adminSearch?.trim()) params.append("adminSearch", adminSearch.trim());
		return params;
	}, [page, actionFilter, startDate, endDate, adminSearch]);

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
		[]
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

	const handleActionChange = useCallback((value: string) => {
		setActionFilter(value === "all" ? null : value);
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

	const tableHeaders = useMemo(
		() => (
			<tr>
				<th className={styles.tableHeaderCell}>
					<DateFilterField
						startDate={startDate}
						endDate={endDate}
						showDateFilter={showDateFilter}
						onToggleFilter={() => setShowDateFilter((v) => !v)}
						onCloseFilter={() => setShowDateFilter(false)}
						onDateRangeChange={handleDateRangeChange}
						formatDateFromString={formatDateFromString}
					/>
				</th>
				{!categoryId && (
					<th className={styles.tableHeaderCell}>Категория</th>
				)}
				<th className={styles.tableHeaderCell}>
					<AdminSearchField
						adminSearch={adminSearch}
						onSearchChange={handleAdminSearchChange}
						onClearSearch={handleClearAdminSearch}
					/>
				</th>
				<th className={styles.tableHeaderCell}>
					<CustomSelect
						options={actionOptions}
						value={actionFilter || "all"}
						onChange={handleActionChange}
						placeholder="Выберите действие"
						className="actionSelect"
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
			categoryId,
			adminSearch,
			handleAdminSearchChange,
			handleClearAdminSearch,
			actionOptions,
			actionFilter,
			handleActionChange,
		]
	);

	return (
		<div className="tableContent">
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetAllFilters} />

			<CategoryLogsTable
				categoryId={categoryId}
				tableHeaders={tableHeaders}
				queryParams={queryParams}
				onLogsUpdate={handleLogsUpdate}
			/>

			<Pagination
				currentPage={page}
				totalPages={totalPages}
				onPageChange={setPage}
				className="logsPagination"
			/>

			{totalCount > 0 && (
				<div className="logsInfo">
					Показано {getRecordsText(totalCount)}
				</div>
			)}
		</div>
	);
}
