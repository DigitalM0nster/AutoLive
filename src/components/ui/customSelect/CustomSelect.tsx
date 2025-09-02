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
	showSearch?: boolean; // Показывать ли поле поиска
	searchPlaceholder?: string; // Плейсхолдер для поля поиска
}

const CustomSelect: React.FC<CustomSelectProps> = ({
	options,
	value,
	onChange,
	placeholder = "Выберите...",
	className = "",
	showSearch = false,
	searchPlaceholder = "Поиск...",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedOption, setSelectedOption] = useState<Option | null>(options.find((option) => option.value === value) || null);
	const [searchValue, setSearchValue] = useState("");
	const selectRef = useRef<HTMLDivElement>(null);

	const toggleDropdown = () => {
		setIsOpen(!isOpen);
		if (!isOpen) {
			setSearchValue(""); // Сбрасываем поиск при открытии
		}
	};

	const handleOptionClick = (option: Option) => {
		setSelectedOption(option);
		onChange(option.value);
		setIsOpen(false);
		setSearchValue(""); // Сбрасываем поиск при выборе
	};

	// Фильтруем опции по поиску
	const filteredOptions =
		showSearch && searchValue
			? options.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()) || option.value.toLowerCase().includes(searchValue.toLowerCase()))
			: options;

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

	// Обработчик изменения поиска
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchValue(e.target.value);
	};

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
					{/* Поле поиска */}
					{showSearch && (
						<div className={styles.searchContainer}>
							<input
								type="text"
								placeholder={searchPlaceholder}
								value={searchValue}
								onChange={handleSearchChange}
								className={styles.searchInput}
								onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике на поле
							/>
						</div>
					)}

					{/* Список опций */}
					{filteredOptions.map((option, index) => (
						<div
							key={option.value}
							className={`${styles.option} ${option.value === selectedOption?.value ? styles.selected : ""} ${index === 0 && !showSearch ? styles.firstOption : ""} ${
								index === filteredOptions.length - 1 ? styles.lastOption : ""
							}`}
							onClick={() => handleOptionClick(option)}
						>
							{option.label}
						</div>
					))}

					{/* Сообщение если ничего не найдено */}
					{showSearch && searchValue && filteredOptions.length === 0 && <div className={styles.noResults}>Ничего не найдено</div>}
				</div>
			)}
		</div>
	);
};

export default CustomSelect;
