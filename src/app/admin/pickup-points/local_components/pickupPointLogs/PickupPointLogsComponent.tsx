"use client";

import React, { useCallback, useMemo, useState } from "react";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter } from "@/lib/types";
import PickupPointLogsTable from "./PickupPointLogsTable";
import styles from "@/app/admin/departments/local_components/styles.module.scss";

const AdminSearchField = React.memo(
	({ adminSearch, onSearchChange, onClearSearch }: { adminSearch: string; onSearchChange: (v: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Кем выполнено:
			<div className="searchInput">
				<input type="text" value={adminSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="ФИО" />
				<div onClick={onClearSearch} className="clearSearchButton" />
			</div>
		</div>
	)
);
AdminSearchField.displayName = "AdminSearchField";

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
		onDateRangeChange: (start: string, end: string) => void;
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
	pickupPointId: number;
};

export default function PickupPointLogsComponent({ pickupPointId }: Props) {
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [actionFilter, setActionFilter] = useState<string | null>(null);
	const [showDateFilter, setShowDateFilter] = useState(false);
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [adminSearch, setAdminSearch] = useState("");

	const queryParams = useMemo(() => {
		const params = new URLSearchParams({ page: page.toString(), limit: "20" });
		if (actionFilter) params.append("action", actionFilter);
		if (startDate?.trim()) params.append("dateFrom", startDate);
		if (endDate?.trim()) params.append("dateTo", endDate);
		if (adminSearch?.trim()) params.append("adminSearch", adminSearch.trim());
		return params;
	}, [page, actionFilter, startDate, endDate, adminSearch]);

	const formatDateFromString = useCallback((dateString: string) => {
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
		if (actionFilter) filters.push({ key: "action", label: "Действие", value: actionOptions.find((o) => o.value === actionFilter)?.label || actionFilter });
		if (startDate?.trim() || endDate?.trim()) filters.push({ key: "date", label: "Дата", value: `${startDate ? formatDateFromString(startDate) : "дд.мм.гггг"} — ${endDate ? formatDateFromString(endDate) : "дд.мм.гггг"}` });
		if (adminSearch?.trim()) filters.push({ key: "adminSearch", label: "Кто изменил", value: adminSearch });
		return filters;
	}, [actionFilter, actionOptions, startDate, endDate, adminSearch, formatDateFromString]);

	const resetAllFilters = useCallback(() => {
		setActionFilter(null);
		setStartDate("");
		setEndDate("");
		setAdminSearch("");
		setPage(1);
	}, []);

	const handleLogsUpdate = useCallback((_totalCount: number, totalPagesCount: number) => {
		setTotalPages(totalPagesCount);
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
						onDateRangeChange={(s, e) => { setStartDate(s); setEndDate(e); setPage(1); }}
						formatDateFromString={formatDateFromString}
					/>
				</th>
				<th className={styles.tableHeaderCell}>
					<AdminSearchField adminSearch={adminSearch} onSearchChange={(v) => { setAdminSearch(v); setPage(1); }} onClearSearch={() => { setAdminSearch(""); setPage(1); }} />
				</th>
				<th className={styles.tableHeaderCell}>
					<CustomSelect options={actionOptions} value={actionFilter || "all"} onChange={(v) => { setActionFilter(v === "all" ? null : v); setPage(1); }} placeholder="Действие" className={styles.actionSelect} />
				</th>
			</tr>
		),
		[startDate, endDate, showDateFilter, formatDateFromString, adminSearch, actionOptions, actionFilter]
	);

	return (
		<div className="tableContent">
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetAllFilters} />
			<PickupPointLogsTable pickupPointId={pickupPointId} tableHeaders={tableHeaders} queryParams={queryParams} onLogsUpdate={handleLogsUpdate} />
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.logsPagination} />
		</div>
	);
}
