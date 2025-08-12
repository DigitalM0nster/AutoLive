"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./DateRangePicker.module.scss";

interface DateRangePickerProps {
	onDateRangeChange: (startDate: string, endDate: string) => void;
	onClose: () => void;
	isOpen: boolean;
}

export default function DateRangePicker({ onDateRangeChange, onClose, isOpen }: DateRangePickerProps) {
	const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
	const [selectedDates, setSelectedDates] = useState<{ start?: Date; end?: Date }>({});
	const [selectionMode, setSelectionMode] = useState<"start" | "end">("start");
	const calendarRef = useRef<HTMLDivElement>(null);

	// Функция для форматирования даты
	const formatDate = (date: Date): string => {
		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear();

		return `${day}.${month}.${year}`;
	};

	// Функция для получения названия месяца
	const getMonthName = (date: Date): string => {
		const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
		return months[date.getMonth()];
	};

	// Функция для получения дней месяца
	const getDaysInMonth = (date: Date): Date[] => {
		const year = date.getFullYear();
		const month = date.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		// Получаем первый день месяца
		const firstDayOfMonth = new Date(year, month, 1);
		const dayOfWeek = firstDayOfMonth.getDay() || 7; // Воскресенье = 0, переводим в 7

		// Создаем массив дней
		const days: Date[] = [];

		// Добавляем дни предыдущего месяца
		const prevMonth = new Date(year, month, 0);
		const daysInPrevMonth = prevMonth.getDate();

		for (let i = dayOfWeek - 1; i > 0; i--) {
			days.push(new Date(year, month - 1, daysInPrevMonth - i + 1));
		}

		// Добавляем дни текущего месяца
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(new Date(year, month, i));
		}

		// Добавляем дни следующего месяца
		const daysToAdd = 42 - days.length; // 6 недель по 7 дней = 42
		for (let i = 1; i <= daysToAdd; i++) {
			days.push(new Date(year, month + 1, i));
		}

		return days;
	};

	// Функция для проверки, находится ли дата в выбранном диапазоне
	const isInRange = (date: Date): boolean => {
		if (!selectedDates.start || !selectedDates.end) return false;

		const time = date.getTime();
		return time >= selectedDates.start.getTime() && time <= selectedDates.end.getTime();
	};

	// Функция для проверки, является ли дата выбранной
	const isSelected = (date: Date): boolean => {
		if (!selectedDates.start && !selectedDates.end) return false;

		if (selectedDates.start && !selectedDates.end) {
			return date.getTime() === selectedDates.start.getTime();
		}

		if (selectedDates.start && selectedDates.end) {
			return date.getTime() === selectedDates.start.getTime() || date.getTime() === selectedDates.end.getTime();
		}

		return false;
	};

	// Обработчик клика по дате
	const handleDateClick = (date: Date) => {
		if (selectionMode === "start") {
			setSelectedDates({ start: date });
			setSelectionMode("end");
		} else {
			// Если конечная дата раньше начальной, меняем их местами
			if (date < selectedDates.start!) {
				setSelectedDates({ start: date, end: selectedDates.start });
			} else {
				setSelectedDates({ ...selectedDates, end: date });
			}
			setSelectionMode("start");
		}
	};

	// Функция для перехода к предыдущему месяцу
	const prevMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	};

	// Функция для перехода к следующему месяцу
	const nextMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	};

	// Функция для применения фильтра по дате
	const applyDateFilter = () => {
		// Форматируем даты для API в локальном времени
		const formatDateForAPI = (date: Date): string => {
			const year = date.getFullYear();
			const month = (date.getMonth() + 1).toString().padStart(2, "0");
			const day = date.getDate().toString().padStart(2, "0");
			return `${year}-${month}-${day}`;
		};

		// Применяем фильтр если выбрана хотя бы одна дата
		if (selectedDates.start || selectedDates.end) {
			const formattedStartDate = selectedDates.start ? formatDateForAPI(selectedDates.start) : "";
			const formattedEndDate = selectedDates.end ? formatDateForAPI(selectedDates.end) : "";
			onDateRangeChange(formattedStartDate, formattedEndDate);
			onClose();
		}
	};

	// Функция для сброса фильтра по дате
	const resetDateFilter = () => {
		setSelectedDates({});
		setSelectionMode("start");
		onDateRangeChange("", "");
		onClose();
	};

	// Обработчик клика вне компонента
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
				onClose();
			}
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div className={styles.dateFilterPopup}>
			<div className={styles.dateFilterOverlay} />
			<div className={styles.dateRangePickerContent} ref={calendarRef}>
				<div className={styles.dateFilterTitle}>
					<span>Фильтр по дате</span>
					<div className={styles.selectionInfo}>Выберите одну или две даты для фильтрации</div>
					<div className={styles.dateInputs}>
						<div className={styles.dateInputGroup}>
							<label>От:</label>
							<input
								type="text"
								value={selectedDates.start ? formatDate(selectedDates.start) : ""}
								placeholder="Выберите дату"
								readOnly
								className={selectionMode === "start" ? styles.active : ""}
							/>
						</div>
						<div className={styles.dateInputGroup}>
							<label>До:</label>
							<input
								type="text"
								value={selectedDates.end ? formatDate(selectedDates.end) : ""}
								placeholder="Выберите дату"
								readOnly
								className={selectionMode === "end" ? styles.active : ""}
							/>
						</div>
					</div>
				</div>

				<div className={styles.calendarHeader}>
					<button className={styles.monthNavButton} onClick={prevMonth}>
						&lt;
					</button>
					<div className={styles.currentMonth}>
						{getMonthName(currentMonth)} {currentMonth.getFullYear()}
					</div>
					<button className={styles.monthNavButton} onClick={nextMonth}>
						&gt;
					</button>
				</div>

				<div className={styles.calendarGrid}>
					<div className={styles.weekDays}>
						<div>Пн</div>
						<div>Вт</div>
						<div>Ср</div>
						<div>Чт</div>
						<div>Пт</div>
						<div>Сб</div>
						<div>Вс</div>
					</div>
					<div className={styles.daysGrid}>
						{getDaysInMonth(currentMonth).map((date, index) => {
							const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
							const isToday = new Date().toDateString() === date.toDateString();
							const isDateSelected = isSelected(date);
							const isDateInRange = isInRange(date);

							return (
								<div
									key={index}
									className={`
											${styles.calendarDay} 
											${isCurrentMonth ? "" : styles.otherMonth} 
											${isToday ? styles.today : ""} 
											${isDateSelected ? styles.selected : ""} 
											${isDateInRange && !isDateSelected ? styles.inRange : ""}
										`}
									onClick={() => isCurrentMonth && handleDateClick(date)}
								>
									{date.getDate()}
								</div>
							);
						})}
					</div>
				</div>

				<div className={styles.dateFilterActions}>
					<button className={styles.resetFilterButton} onClick={resetDateFilter}>
						Сбросить
					</button>
					<button className={styles.applyFilterButton} onClick={applyDateFilter} disabled={!selectedDates.start && !selectedDates.end}>
						Применить
					</button>
				</div>
			</div>
		</div>
	);
}
