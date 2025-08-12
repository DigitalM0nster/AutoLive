"use client";

import React from "react";
import styles from "./styles.module.scss";

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	className?: string;
}

/**
 * Компонент пагинации для навигации по страницам
 * @param currentPage - текущая страница
 * @param totalPages - общее количество страниц
 * @param onPageChange - функция обработки изменения страницы
 * @param className - дополнительный CSS класс
 */
export default function Pagination({ currentPage, totalPages, onPageChange, className = "" }: PaginationProps) {
	// Если всего одна страница, не показываем пагинацию
	if (totalPages <= 1) {
		return null;
	}

	// Формируем массив страниц для отображения
	const renderPageNumbers = () => {
		const pages: (number | "...")[] = [];
		const addPage = (page: number) => {
			if (page >= 1 && page <= totalPages && !pages.includes(page)) {
				pages.push(page);
			}
		};

		// Всегда добавляем первую страницу
		addPage(1);

		// Если текущая страница далеко от начала, добавляем многоточие
		if (currentPage > 3) {
			pages.push("...");
		}

		// Добавляем страницы вокруг текущей
		addPage(currentPage - 1);
		addPage(currentPage);
		addPage(currentPage + 1);

		// Если текущая страница далеко от конца, добавляем многоточие
		if (currentPage < totalPages - 2) {
			pages.push("...");
		}

		// Всегда добавляем последнюю страницу
		addPage(totalPages);

		return pages;
	};

	return (
		<div className={`pagination ${styles.pagination} ${className}`}>
			{renderPageNumbers().map((page, index) =>
				page === "..." ? (
					<span key={`dots-${index}`} className={styles.dots}>
						...
					</span>
				) : (
					<button
						key={`page-${page}`}
						onClick={() => onPageChange(page as number)}
						className={`${styles.pageButton} ${page === currentPage ? `${styles.active} active` : ""}`}
					>
						{page}
					</button>
				)
			)}
		</div>
	);
}
