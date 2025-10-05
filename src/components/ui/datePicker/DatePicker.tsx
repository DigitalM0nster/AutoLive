"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./DatePicker.module.scss";

interface DatePickerProps {
	onDateChange: (date: string) => void;
	onClose: () => void;
	isOpen: boolean;
	value?: string; // Текущее значение даты в формате YYYY-MM-DD
	placeholder?: string;
}

export default function DatePicker({ onDateChange, onClose, isOpen, value, placeholder = "Выберите дату" }: DatePickerProps) {
	const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const calendarRef = useRef<HTMLDivElement>(null);

	// Инициализируем выбранную дату из value
	useEffect(() => {
		if (value) {
			const date = new Date(value);
			if (!isNaN(date.getTime())) {
				setSelectedDate(date);
				setCurrentMonth(date);
			}
		} else {
			setSelectedDate(null);
		}
	}, [value]);

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

	// Функция для проверки, является ли дата выбранной
	const isSelected = (date: Date): boolean => {
		if (!selectedDate) return false;
		return date.getTime() === selectedDate.getTime();
	};

	// Обработчик клика по дате
	const handleDateClick = (date: Date) => {
		setSelectedDate(date);
	};

	// Функция для перехода к предыдущему месяцу
	const prevMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	};

	// Функция для перехода к следующему месяцу
	const nextMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	};

	// Функция для применения выбранной даты
	const applyDate = () => {
		if (selectedDate) {
			// Форматируем дату для API в локальном времени
			const year = selectedDate.getFullYear();
			const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
			const day = selectedDate.getDate().toString().padStart(2, "0");
			const formattedDate = `${year}-${month}-${day}`;

			onDateChange(formattedDate);
			onClose();
		}
	};

	// Функция для сброса даты
	const resetDate = () => {
		setSelectedDate(null);
		onDateChange("");
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
		<div className={styles.datePickerPopup}>
			<div className={styles.datePickerOverlay} />
			<div className={styles.datePickerContent} ref={calendarRef}>
				<div className={styles.datePickerTitle}>
					<span>Выбор даты</span>
					<div className={styles.selectedDateInfo}>{selectedDate ? formatDate(selectedDate) : placeholder}</div>
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

							return (
								<div
									key={index}
									className={`
										${styles.calendarDay} 
										${isCurrentMonth ? "" : styles.otherMonth} 
										${isToday ? styles.today : ""} 
										${isDateSelected ? styles.selected : ""}
									`}
									onClick={() => isCurrentMonth && handleDateClick(date)}
								>
									{date.getDate()}
								</div>
							);
						})}
					</div>
				</div>

				<div className={styles.datePickerActions}>
					<button className={styles.resetButton} onClick={resetDate}>
						Сбросить
					</button>
					<button className={styles.applyButton} onClick={applyDate} disabled={!selectedDate}>
						Применить
					</button>
				</div>
			</div>
		</div>
	);
}
