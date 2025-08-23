import styles from "./styles.module.scss";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { useState, useCallback, useMemo } from "react";
import React from "react";
import AllDepartmentsLogsTable from "./AllDepartmentsLogsTable";

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

// Отдельный компонент для поля поиска целевого пользователя
const TargetDepartmentSearchField = React.memo(
	({ targetDepartmentSearch, onSearchChange, onClearSearch }: { targetDepartmentSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Измененный отдел:
			<div className="searchInput">
				<input type="text" value={targetDepartmentSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Введите название отдела" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
);

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

export default function AllDepartmentsLogsComponent() {
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [actionFilter, setActionFilter] = useState<string | null>(null);

	// Состояния для фильтрации по дате
	const [showDateFilter, setShowDateFilter] = useState(false);
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [isDateFiltered, setIsDateFiltered] = useState(false);

	// Состояния для поиска по администратору и целевому пользователю
	const [adminSearch, setAdminSearch] = useState<string>("");
	const [targetDepartmentSearch, setTargetDepartmentSearch] = useState<string>("");

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
			params.append("startDate", startDate);
		}

		if (endDate && endDate.trim() !== "") {
			params.append("endDate", endDate);
		}

		// Добавляем поиск по администратору
		if (adminSearch && adminSearch.trim() !== "") {
			params.append("adminSearch", adminSearch.trim());
		}

		// Добавляем поиск по целевому пользователю
		if (targetDepartmentSearch && targetDepartmentSearch.trim() !== "") {
			params.append("targetDepartmentSearch", targetDepartmentSearch.trim());
		}

		return params;
	}, [page, actionFilter, startDate, endDate, adminSearch, targetDepartmentSearch]);

	// Функция для очистки логов отделов
	const handleClearLogs = useCallback(async () => {
		if (!confirm("Вы уверены, что хотите очистить все логи отделов? Это действие нельзя отменить.")) {
			return;
		}

		try {
			setClearingLogs(true);
			const response = await fetch(`/api/departments/logs`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Не удалось очистить логи отделов");
			}

			// Обновляем список логов после очистки
			setPage(1);
			alert("Логи отделов успешно очищены");
		} catch (error) {
			console.error("Ошибка при очистке логов:", error);
			alert("Не удалось очистить логи отделов");
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

		if (targetDepartmentSearch && targetDepartmentSearch.trim() !== "") {
			filters.push({
				key: "targetDepartmentSearch",
				label: "Измененный отдел",
				value: targetDepartmentSearch,
			});
		}

		return filters;
	}, [actionFilter, actionOptions, startDate, endDate, adminSearch, targetDepartmentSearch, formatDateFromString]);

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
		setTargetDepartmentSearch("");
		setPage(1);
	}, []);

	// Обработчики для полей поиска
	const handleAdminSearchChange = useCallback((value: string) => {
		setAdminSearch(value);
		setPage(1);
	}, []);

	const handleTargetDepartmentSearchChange = useCallback((value: string) => {
		setTargetDepartmentSearch(value);
		setPage(1);
	}, []);

	// Обработчики для очистки поиска
	const handleClearAdminSearch = useCallback(() => {
		setAdminSearch("");
		setPage(1);
	}, []);

	const handleClearTargetDepartmentSearch = useCallback(() => {
		setTargetDepartmentSearch("");
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
					<TargetDepartmentSearchField
						targetDepartmentSearch={targetDepartmentSearch}
						onSearchChange={handleTargetDepartmentSearchChange}
						onClearSearch={handleClearTargetDepartmentSearch}
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
			targetDepartmentSearch,
			handleTargetDepartmentSearchChange,
			handleClearTargetDepartmentSearch,
			actionOptions,
			actionFilter,
			handleActionChange,
		]
	);

	return (
		<div className={`tableContent`}>
			{/* Используем переиспользуемый блок фильтров */}
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetAllFilters} />

			<AllDepartmentsLogsTable tableHeaders={tableHeaders} queryParams={queryParams} onLogsUpdate={handleLogsUpdate} />

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
