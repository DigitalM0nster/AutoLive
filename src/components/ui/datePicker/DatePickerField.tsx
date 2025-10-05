"use client";

import { useState } from "react";
import DatePicker from "./DatePicker";
import styles from "./DatePickerField.module.scss";

interface DatePickerFieldProps {
	label?: string;
	value?: string;
	onChange: (date: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export default function DatePickerField({ label, value, onChange, placeholder = "Выберите дату", className = "", disabled = false }: DatePickerFieldProps) {
	const [isOpen, setIsOpen] = useState(false);

	// Функция для форматирования даты для отображения
	const formatDisplayDate = (dateString: string): string => {
		if (!dateString) return "";

		const date = new Date(dateString);
		if (isNaN(date.getTime())) return "";

		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear();

		return `${day}.${month}.${year}`;
	};

	const handleDateChange = (date: string) => {
		onChange(date);
	};

	const handleTogglePicker = () => {
		if (!disabled) {
			setIsOpen(!isOpen);
		}
	};

	const handleClosePicker = () => {
		setIsOpen(false);
	};

	return (
		<div className={`${styles.datePickerField} ${className}`}>
			{label && <label className={styles.label}>{label}</label>}
			<div className={`${styles.dateInput} ${disabled ? styles.disabled : ""}`} onClick={handleTogglePicker}>
				<span className={value ? styles.hasValue : styles.placeholder}>{value ? formatDisplayDate(value) : placeholder}</span>
				<div className={styles.calendarIcon}>📅</div>
			</div>

			<DatePicker isOpen={isOpen} onClose={handleClosePicker} onDateChange={handleDateChange} value={value} placeholder={placeholder} />
		</div>
	);
}
