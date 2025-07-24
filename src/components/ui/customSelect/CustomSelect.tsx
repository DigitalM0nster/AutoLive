"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./styles.module.scss";

interface Option {
	value: string;
	label: string;
}

interface CustomSelectProps {
	options: Option[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, placeholder = "Выберите...", className = "" }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedOption, setSelectedOption] = useState<Option | null>(options.find((option) => option.value === value) || null);
	const selectRef = useRef<HTMLDivElement>(null);

	const toggleDropdown = () => setIsOpen(!isOpen);

	const handleOptionClick = (option: Option) => {
		setSelectedOption(option);
		onChange(option.value);
		setIsOpen(false);
	};

	// Закрытие выпадающего списка при клике вне компонента
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	// Обновление выбранной опции при изменении значения извне
	useEffect(() => {
		const option = options.find((option) => option.value === value);
		setSelectedOption(option || null);
	}, [value, options]);

	return (
		<div className={`${styles.customSelect} ${className}`} ref={selectRef}>
			<div className={styles.selectHeader} onClick={toggleDropdown}>
				<div className={styles.selectedValue}>{selectedOption ? selectedOption.label : placeholder}</div>
				<div className={styles.arrow}>
					<svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
					</svg>
				</div>
			</div>
			{isOpen && (
				<div className={styles.optionsContainer}>
					{options.map((option, index) => (
						<div
							key={option.value}
							className={`${styles.option} ${option.value === selectedOption?.value ? styles.selected : ""} ${index === 0 ? styles.firstOption : ""} ${
								index === options.length - 1 ? styles.lastOption : ""
							}`}
							onClick={() => handleOptionClick(option)}
						>
							{option.label}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default CustomSelect;
