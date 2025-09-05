"use client";

// Используем стандартные классы из globals.scss
import Link from "next/link";
import Pagination from "@/components/ui/pagination/Pagination";
import Loading from "@/components/ui/loading/Loading";
import DataError from "@/components/ui/dataError/DataError";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DateRangePicker from "@/components/ui/dateRangePicker/DateRangePicker";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ProductLog, ProductLogResponse, ActiveFilter } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import React from "react";
import ProductLogsTable from "./ProductLogsTable";

// Компонент для поля поиска
const AdminSearchField = React.memo(
	({ adminSearch, onSearchChange, onClearSearch }: { adminSearch: string; onSearchChange: (value: string) => void; onClearSearch: () => void }) => (
		<div className="searchFilterHeader">
			Кем выполнено:
			<div className="searchInput">
				<input type="text" value={adminSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="ID, телефон или ФИО" />
				<div onClick={onClearSearch} className="clearSearchButton"></div>
			</div>
		</div>
	)
);
AdminSearchField.displayName = "AdminSearchField";

// Компонент для фильтра даты
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
			<div className={`dateFilter ${startDate || endDate ? "active" : ""}`} onClick={onToggleFilter}>
				{startDate ? formatDateFromString(startDate) : "дд.мм.гггг"} — {endDate ? formatDateFromString(endDate) : "дд.мм.гггг"}
			</div>
			<DateRangePicker isOpen={showDateFilter} onClose={onCloseFilter} onDateRangeChange={onDateRangeChange} />
		</div>
	)
);
DateFilterField.displayName = "DateFilterField";

type ProductLogsComponentProps = {
	productId?: number; // Опциональный параметр для фильтрации логов по конкретному товару
};

export default function ProductLogsComponent({ productId }: ProductLogsComponentProps) {
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
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

		return params;
	}, [page, actionFilter, startDate, endDate, adminSearch]);

	// Функция для форматирования даты из строки YYYY-MM-DD в DD.MM.YYYY
	const formatDateFromString = (dateString: string): string => {
		if (!dateString) return "";

		const date = new Date(dateString);
		if (isNaN(date.getTime())) return "";

		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear();

		return `${day}.${month}.${year}`;
	};

	// Функция для получения описания действия
	const getActionDescription = (log: ProductLog): string => {
		switch (log.action) {
			case "create":
				return "Создание товара";
			case "update":
				return "Редактирование товара";
			case "delete":
				return "Удаление товара";
			case "bulk":
				return "Массовые операции";
			case "import":
				return "Импорт товаров";
			default:
				return log.action || "Действие";
		}
	};

	// Функция для создания массива активных фильтров
	const getActiveFilters = (): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];

		if (actionFilter) {
			filters.push({
				key: "action",
				label: "Тип действия",
				value: getActionDescription({ action: actionFilter } as ProductLog),
			});
		}

		if (isDateFiltered) {
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

		return filters;
	};

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
	const resetAllFilters = () => {
		setActionFilter(null);
		setStartDate("");
		setEndDate("");
		setIsDateFiltered(false);
		setAdminSearch("");
		setPage(1);
	};

	// Обработчики для поиска по администратору
	const handleAdminSearchChange = (value: string) => {
		setAdminSearch(value);
		setPage(1);
	};

	const handleClearAdminSearch = () => {
		setAdminSearch("");
		setPage(1);
	};

	// Мемоизируем опции для селекта действий
	const actionOptions = useMemo(
		() => [
			{ value: "all", label: "Все действия" },
			{ value: "create", label: "Создание" },
			{ value: "update", label: "Редактирование" },
			{ value: "delete", label: "Удаление" },
			{ value: "bulk", label: "Массовые операции" },
			{ value: "import", label: "Импорт" },
		],
		[]
	);

	// Мемоизируем обработчик изменения действия
	const handleActionChange = useCallback((value: string) => {
		setActionFilter(value === "all" ? null : value);
		setPage(1); // Сбрасываем страницу при изменении фильтра
	}, []);

	// Обработчик обновления данных логов
	const handleLogsUpdate = useCallback((totalPages: number) => {
		setTotalPages(totalPages);
	}, []);

	// Мемоизируем заголовки таблицы для предотвращения ререндеров
	const tableHeaders = useMemo(
		() => (
			<tr>
				<th className={`tableHeaderCell dateCell`}>
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
				<th className={`tableHeaderCell`}>
					<AdminSearchField adminSearch={adminSearch} onSearchChange={handleAdminSearchChange} onClearSearch={handleClearAdminSearch} />
				</th>
				<th className={`tableHeaderCell`}>
					<CustomSelect options={actionOptions} value={actionFilter || "all"} onChange={handleActionChange} placeholder="Выберите действие" className={`actionSelect`} />
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
			actionOptions,
			actionFilter,
			handleActionChange,
		]
	);

	if (error) {
		return <DataError message={error} />;
	}

	return (
		<div className={`tableContent`}>
			{/* Ссылка на страницу товара */}
			<div className={`productNavigation`}>
				<Link href={`/admin/product-management/products/${productId}`} className={`itemLink`}>
					← Вернуться к товару
				</Link>
			</div>

			{/* Используем переиспользуемый блок фильтров */}
			<FiltersBlock activeFilters={getActiveFilters()} onResetFilters={resetAllFilters} />

			<ProductLogsTable productId={productId} tableHeaders={tableHeaders} queryParams={queryParams} onLogsUpdate={handleLogsUpdate} />

			{/* Пагинация */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={`logsPagination`} />
		</div>
	);
}
