"use client";

import styles from "../styles.module.scss";
import Pagination from "@/components/ui/pagination/Pagination";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ProductLog, ActiveFilter } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import React from "react";
import AllProductsLogsTable from "./AllProductsLogsTable";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";

// Отдельный компонент для поля поиска администратора
const AdminSearchField = React.memo(
	({ adminSearch, onSearchChange, onClearSearch }: { adminSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Кем выполнено:
			<div className="searchInput">
				<input type="text" value={adminSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Введите имя администратора" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
);
AdminSearchField.displayName = "AdminSearchField";

// Отдельный компонент для поля поиска целевого продукта
const TargetProductSearchField = React.memo(
	({ targetProductSearch, onSearchChange, onClearSearch }: { targetProductSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Какой продукт изменили:
			<div className="searchInput">
				<input type="text" value={targetProductSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Введите название продукта" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
);
TargetProductSearchField.displayName = "TargetProductSearchField";

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
			<div className="dateFilter" onClick={onToggleFilter}>
				{startDate ? formatDateFromString(startDate) : "дд.мм.гггг"} — {endDate ? formatDateFromString(endDate) : "дд.мм.гггг"}
			</div>
			<DateRangePicker isOpen={showDateFilter} onClose={onCloseFilter} onDateRangeChange={onDateRangeChange} />
		</div>
	)
);
DateFilterField.displayName = "DateFilterField";

export default function AllProductsLogsComponent() {
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [actionFilter, setActionFilter] = useState<string | null>(null);

	// Состояния для фильтрации по дате
	const [showDateFilter, setShowDateFilter] = useState(false);
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [isDateFiltered, setIsDateFiltered] = useState(false);

	// Состояния для поиска по администратору и целевому продукту
	const [adminSearch, setAdminSearch] = useState<string>("");
	const [targetProductSearch, setTargetProductSearch] = useState<string>("");
	const [showAdminSearch, setShowAdminSearch] = useState(false);
	const [showTargetProductSearch, setShowTargetProductSearch] = useState(false);

	// Состояние для фильтра по отделу
	const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
	const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

	const [clearingLogs, setClearingLogs] = useState(false);

	const { user } = useAuthStore();

	// Функция для загрузки отделов
	const loadDepartments = useCallback(async () => {
		try {
			const response = await fetch("/api/departments", {
				credentials: "include",
			});
			if (response.ok) {
				const departmentsData = await response.json();
				setDepartments(departmentsData);
			}
		} catch (error) {
			console.error("Ошибка при загрузке отделов:", error);
		}
	}, []);

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

		// Добавляем поиск по целевому продукту
		if (targetProductSearch && targetProductSearch.trim() !== "") {
			params.append("targetProductSearch", targetProductSearch.trim());
		}

		// Добавляем фильтр по отделу
		if (departmentFilter && departmentFilter !== "all") {
			params.append("departmentId", departmentFilter);
		}

		return params;
	}, [page, actionFilter, startDate, endDate, adminSearch, targetProductSearch, departmentFilter]);

	// Функция для очистки логов продуктов
	const handleClearLogs = useCallback(async () => {
		if (!confirm("Вы уверены, что хотите очистить все логи продуктов? Это действие нельзя отменить.")) {
			return;
		}

		try {
			setClearingLogs(true);
			const response = await fetch(`/api/products/logs?confirm=true`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Не удалось очистить логи продуктов");
			}

			const result = await response.json();

			// Обновляем список логов после очистки
			setTotalCount(0);
			setPage(1);

			// Показываем детальную информацию об удалении
			if (result.details) {
				showSuccessToast(
					`Логи продуктов успешно очищены! Удалено: Обычных логов: ${result.details.productLogs}, Массовых операций: ${result.details.bulkLogs}, Всего: ${result.deletedCount}`
				);
			} else {
				showSuccessToast(`Логи продуктов успешно очищены! Удалено: ${result.deletedCount} логов`);
			}
		} catch (error) {
			console.error("Ошибка при очистке логов:", error);
			const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
			showErrorToast(`Не удалось очистить логи продуктов: ${errorMessage}`);
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

	// Функция для получения описания действия
	const getActionDescription = useCallback((action: string): string => {
		switch (action) {
			case "create":
				return "Создание продукта";
			case "update":
				return "Редактирование продукта";
			case "delete":
			case "bulk_delete":
				return "Удаление";
			case "import":
				return "Импорт";
			default:
				return action || "Действие";
		}
	}, []);

	// Функция для создания массива активных фильтров
	const getActiveFilters = useCallback((): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];

		if (actionFilter) {
			filters.push({
				key: "action",
				label: "Тип действия",
				value: getActionDescription(actionFilter),
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

		if (targetProductSearch && targetProductSearch.trim() !== "") {
			filters.push({
				key: "targetProductSearch",
				label: "Какой продукт изменили",
				value: targetProductSearch,
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

		return filters;
	}, [actionFilter, startDate, endDate, adminSearch, targetProductSearch, departmentFilter, departments, getActionDescription, formatDateFromString]);

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
		setTargetProductSearch("");
		setDepartmentFilter(null);
		setPage(1);
	}, []);

	// Обработчики для полей поиска
	const handleAdminSearchChange = useCallback((value: string) => {
		setAdminSearch(value);
		setPage(1);
	}, []);

	const handleTargetProductSearchChange = useCallback((value: string) => {
		setTargetProductSearch(value);
		setPage(1);
	}, []);

	// Обработчики для очистки поиска
	const handleClearAdminSearch = useCallback(() => {
		setAdminSearch("");
		setShowAdminSearch(false);
		setPage(1);
	}, []);

	const handleClearTargetProductSearch = useCallback(() => {
		setTargetProductSearch("");
		setShowTargetProductSearch(false);
		setPage(1);
	}, []);

	// Обработчик изменения фильтра по отделу
	const handleDepartmentChange = useCallback((value: string) => {
		setDepartmentFilter(value === "all" ? null : value);
		setPage(1);
	}, []);

	// Мемоизируем опции для селекта действий
	const actionOptions = useMemo(
		() => [
			{ value: "all", label: "Все действия" },
			{ value: "create", label: "Создание" },
			{ value: "update", label: "Редактирование" },
			{ value: "delete", label: "Удаление" },
			{ value: "import", label: "Импорт" },
		],
		[]
	);

	// Мемоизируем опции для селекта отделов
	const departmentOptions = useMemo(
		() => [
			{ value: "all", label: "Все отделы" },
			...(departments || []).map((dept) => ({
				value: dept.id.toString(),
				label: dept.name,
			})),
		],
		[departments]
	);

	// Мемоизируем обработчик изменения действия
	const handleActionChange = useCallback((value: string) => {
		setActionFilter(value === "all" ? null : value);
		setPage(1); // Сбрасываем страницу при изменении фильтра
	}, []);

	// Функция для правильного склонения слов
	const getRecordsText = useCallback((count: number) => {
		const lastDigit = count % 10;
		const lastTwoDigits = count % 100;

		if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
			return `${count} записей`;
		}

		switch (lastDigit) {
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

	// Обработчик обновления данных логов
	const handleLogsUpdate = useCallback((totalCount: number, totalPages: number) => {
		setTotalCount(totalCount);
		setTotalPages(totalPages);
	}, []);

	// Загружаем отделы при монтировании компонента
	useEffect(() => {
		loadDepartments();
	}, [loadDepartments]);

	// Мемоизируем заголовки таблицы для предотвращения ререндеров
	const tableHeaders = useMemo(
		() => (
			<tr>
				<th className="dateCell">
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
				<th>
					<AdminSearchField adminSearch={adminSearch} onSearchChange={handleAdminSearchChange} onClearSearch={handleClearAdminSearch} />
				</th>
				<th>
					<CustomSelect
						options={departmentOptions}
						value={departmentFilter || "all"}
						onChange={handleDepartmentChange}
						placeholder="Выберите отдел"
						className={styles.actionSelect}
					/>
				</th>
				<th>
					<TargetProductSearchField
						targetProductSearch={targetProductSearch}
						onSearchChange={handleTargetProductSearchChange}
						onClearSearch={handleClearTargetProductSearch}
					/>
				</th>
				<th>
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
			departmentOptions,
			departmentFilter,
			handleDepartmentChange,
			targetProductSearch,
			handleTargetProductSearchChange,
			handleClearTargetProductSearch,
			actionOptions,
			actionFilter,
			handleActionChange,
		]
	);

	return (
		<div className={`tableContent`}>
			{/* Используем переиспользуемый блок фильтров */}
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetAllFilters} />

			<AllProductsLogsTable logs={[]} tableHeaders={tableHeaders} queryParams={queryParams} onLogsUpdate={handleLogsUpdate} />

			{/* Пагинация */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.logsPagination} />

			{/* Информация о количестве записей */}
			{totalCount > 0 && (
				<div className={styles.logsInfo}>
					Показана {getRecordsText(totalCount)} из {totalCount}
				</div>
			)}

			{/* Кнопка для очистки логов */}
			{user?.role === "superadmin" && (
				<button onClick={handleClearLogs} className={styles.clearLogsButton} disabled={clearingLogs}>
					{clearingLogs ? "Очистка..." : "Очистить логи"}
				</button>
			)}
		</div>
	);
}
