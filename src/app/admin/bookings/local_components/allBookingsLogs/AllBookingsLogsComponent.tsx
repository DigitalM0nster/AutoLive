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
import AllBookingsLogsTable from "./AllBookingsLogsTable";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";

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

// Отдельный компонент для поля поиска записи
const TargetBookingSearchField = React.memo(
	({ targetBookingSearch, onSearchChange, onClearSearch }: { targetBookingSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Запись:
			<div className="searchInput">
				<input type="text" value={targetBookingSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Введите ID записи" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
);
TargetBookingSearchField.displayName = "TargetBookingSearchField";

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

export default function AllBookingsLogsComponent() {
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [actionFilter, setActionFilter] = useState<string | null>(null);

	// Состояния для фильтрации по дате
	const [showDateFilter, setShowDateFilter] = useState(false);
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [isDateFiltered, setIsDateFiltered] = useState(false);

	// Состояния для поиска по администратору и записи
	const [adminSearch, setAdminSearch] = useState<string>("");
	const [targetBookingSearch, setTargetBookingSearch] = useState<string>("");

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

		// Добавляем параметры фильтрации по дате (API использует dateFrom/dateTo, а не startDate/endDate)
		if (startDate && startDate.trim() !== "") {
			params.append("dateFrom", startDate);
		}

		if (endDate && endDate.trim() !== "") {
			params.append("dateTo", endDate);
		}

		// Добавляем поиск по ID записи
		if (targetBookingSearch && targetBookingSearch.trim() !== "") {
			params.append("bookingId", targetBookingSearch.trim());
		}

		// Примечание: API не поддерживает поиск по администратору, поэтому adminSearch не добавляется в параметры
		// Фильтрация по администратору будет выполняться на клиенте (опционально)

		return params;
	}, [page, actionFilter, startDate, endDate, targetBookingSearch]);

	// Функция для очистки логов записей
	const handleClearLogs = useCallback(async () => {
		if (!confirm("Вы уверены, что хотите очистить все логи записей? Это действие нельзя отменить.")) {
			return;
		}

		try {
			setClearingLogs(true);
			const response = await fetch(`/api/bookings/logs`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Не удалось очистить логи записей");
			}

			// Обновляем список логов после очистки
			setPage(1);
			showSuccessToast("Логи записей успешно очищены");
		} catch (error) {
			console.error("Ошибка при очистке логов:", error);
			showErrorToast("Не удалось очистить логи записей");
		} finally {
			setClearingLogs(false);
		}
	}, []);

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
			{ value: "assign", label: "Назначение менеджера" },
			{ value: "status_change", label: "Изменение статуса" },
			{ value: "cancel", label: "Отмена" },
			{ value: "unassign", label: "Снятие назначения" },
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

		if (targetBookingSearch && targetBookingSearch.trim() !== "") {
			filters.push({
				key: "targetBookingSearch",
				label: "Запись",
				value: targetBookingSearch,
			});
		}

		return filters;
	}, [actionFilter, actionOptions, startDate, endDate, adminSearch, targetBookingSearch, formatDateFromString]);

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
		setTargetBookingSearch("");
		setPage(1);
	}, []);

	// Обработчики для полей поиска
	const handleAdminSearchChange = useCallback((value: string) => {
		setAdminSearch(value);
		setPage(1);
	}, []);

	const handleTargetBookingSearchChange = useCallback((value: string) => {
		setTargetBookingSearch(value);
		setPage(1);
	}, []);

	// Обработчики для очистки поиска
	const handleClearAdminSearch = useCallback(() => {
		setAdminSearch("");
		setPage(1);
	}, []);

	const handleClearTargetBookingSearch = useCallback(() => {
		setTargetBookingSearch("");
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
					<TargetBookingSearchField
						targetBookingSearch={targetBookingSearch}
						onSearchChange={handleTargetBookingSearchChange}
						onClearSearch={handleClearTargetBookingSearch}
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
			targetBookingSearch,
			handleTargetBookingSearchChange,
			handleClearTargetBookingSearch,
			actionOptions,
			actionFilter,
			handleActionChange,
		]
	);

	return (
		<div className={`tableContent`}>
			{/* Используем переиспользуемый блок фильтров */}
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetAllFilters} />

			<AllBookingsLogsTable tableHeaders={tableHeaders} queryParams={queryParams} onLogsUpdate={handleLogsUpdate} adminSearch={adminSearch} />

			{/* Пагинация */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.logsPagination} />
			{/* Кнопка для очистки логов */}
			{user?.role === "superadmin" && (
				<button onClick={handleClearLogs} className={styles.clearLogsButton} disabled={clearingLogs}>
					{clearingLogs ? "Очистка..." : "Очистить логи"}
				</button>
			)}
		</div>
	);
}