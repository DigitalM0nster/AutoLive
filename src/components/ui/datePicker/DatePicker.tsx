"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./DatePicker.module.scss";

interface DatePickerProps {
	onDateChange: (date: string) => void;
	onClose: () => void;
	isOpen: boolean;
	value?: string;
	anchorRef?: React.RefObject<HTMLElement | null>;
}

type PopoverPlacement = "bottom" | "top";

const POPOVER_ESTIMATED_HEIGHT = 340;

export default function DatePicker({ onDateChange, onClose, isOpen, value, anchorRef }: DatePickerProps) {
	const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [position, setPosition] = useState({ top: 0, left: 0, width: 280, placement: "bottom" as PopoverPlacement });
	const calendarRef = useRef<HTMLDivElement>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

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

	// Позиция popover относительно поля ввода (viewport), не родительского блока заказа
	const updatePosition = useCallback(() => {
		if (!anchorRef?.current) return;

		const rect = anchorRef.current.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const placement: PopoverPlacement = spaceBelow < POPOVER_ESTIMATED_HEIGHT && rect.top > POPOVER_ESTIMATED_HEIGHT ? "top" : "bottom";

		setPosition({
			top: placement === "bottom" ? rect.bottom + 6 : rect.top - 6,
			left: rect.left,
			width: Math.max(rect.width, 280),
			placement,
		});
	}, [anchorRef]);

	useEffect(() => {
		if (!isOpen) return;

		updatePosition();
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [isOpen, updatePosition]);

	// Закрытие по клику вне и Escape
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			if (calendarRef.current?.contains(target)) return;
			if (anchorRef?.current?.contains(target)) return;
			onClose();
		}

		function handleEscape(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleEscape);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, onClose, anchorRef]);

	const getDaysInMonth = (date: Date): Date[] => {
		const year = date.getFullYear();
		const month = date.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const firstDayOfMonth = new Date(year, month, 1);
		const dayOfWeek = firstDayOfMonth.getDay() || 7;
		const days: Date[] = [];
		const prevMonth = new Date(year, month, 0);
		const daysInPrevMonth = prevMonth.getDate();

		for (let i = dayOfWeek - 1; i > 0; i--) {
			days.push(new Date(year, month - 1, daysInPrevMonth - i + 1));
		}

		for (let i = 1; i <= daysInMonth; i++) {
			days.push(new Date(year, month, i));
		}

		const daysToAdd = 42 - days.length;
		for (let i = 1; i <= daysToAdd; i++) {
			days.push(new Date(year, month + 1, i));
		}

		return days;
	};

	const getMonthName = (date: Date): string => {
		const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
		return months[date.getMonth()];
	};

	const isSelected = (date: Date): boolean => {
		if (!selectedDate) return false;
		return date.getTime() === selectedDate.getTime();
	};

	const handleDateClick = (date: Date) => {
		setSelectedDate(date);
	};

	const prevMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	};

	const nextMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	};

	const applyDate = () => {
		if (!selectedDate) return;

		const year = selectedDate.getFullYear();
		const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
		const day = selectedDate.getDate().toString().padStart(2, "0");

		onDateChange(`${year}-${month}-${day}`);
		onClose();
	};

	const resetDate = () => {
		setSelectedDate(null);
		onDateChange("");
		onClose();
	};

	if (!isOpen || !mounted) return null;

	const popoverStyle: React.CSSProperties =
		position.placement === "bottom"
			? { top: position.top, left: position.left, width: position.width }
			: { bottom: window.innerHeight - position.top, left: position.left, width: position.width };

	return createPortal(
		<div
			className={[styles.datePickerPopover, position.placement === "top" ? styles.above : ""].filter(Boolean).join(" ")}
			style={popoverStyle}
			ref={calendarRef}
			role="dialog"
			aria-label="Выбор даты"
		>
			<div className={styles.calendarHeader}>
				<button type="button" className={styles.monthNavButton} onClick={prevMonth} aria-label="Предыдущий месяц">
					&lt;
				</button>
				<div className={styles.currentMonth}>
					{getMonthName(currentMonth)} {currentMonth.getFullYear()}
				</div>
				<button type="button" className={styles.monthNavButton} onClick={nextMonth} aria-label="Следующий месяц">
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
								className={[
									styles.calendarDay,
									!isCurrentMonth ? styles.otherMonth : "",
									isToday ? styles.today : "",
									isDateSelected ? styles.selected : "",
								]
									.filter(Boolean)
									.join(" ")}
								onClick={() => isCurrentMonth && handleDateClick(date)}
							>
								{date.getDate()}
							</div>
						);
					})}
				</div>
			</div>

			<div className={styles.datePickerActions}>
				<button type="button" className={styles.resetButton} onClick={resetDate}>
					Сбросить
				</button>
				<button type="button" className={styles.applyButton} onClick={applyDate} disabled={!selectedDate}>
					Применить
				</button>
			</div>
		</div>,
		document.body,
	);
}
