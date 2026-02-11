"use client";

import React, { useRef, useState, useEffect } from "react";
import styles from "./ScrollableTableWrapper.module.scss";

interface ScrollableTableWrapperProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * Компонент-обертка для таблиц с горизонтальным скроллом через драг
 * Позволяет удобно прокручивать широкие таблицы на маленьких экранах
 */
export default function ScrollableTableWrapper({ children, className = "" }: ScrollableTableWrapperProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [startX, setStartX] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [canScroll, setCanScroll] = useState(false);

	// Проверяем, нужен ли горизонтальный скролл
	useEffect(() => {
		const checkScroll = () => {
			if (scrollContainerRef.current) {
				const container = scrollContainerRef.current;
				const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
				setCanScroll(hasHorizontalScroll);
			}
		};

		checkScroll();
		window.addEventListener("resize", checkScroll);
		return () => window.removeEventListener("resize", checkScroll);
	}, [children]);

	// Обработка начала драга
	const handleMouseDown = (e: React.MouseEvent) => {
		if (!scrollContainerRef.current || !canScroll) return;

		setIsDragging(true);
		setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
		setScrollLeft(scrollContainerRef.current.scrollLeft);
		scrollContainerRef.current.style.cursor = "grabbing";
		scrollContainerRef.current.style.userSelect = "none";
	};

	// Обработка движения мыши при драге (используется через addEventListener)
	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging || !scrollContainerRef.current) return;

		e.preventDefault();
		const x = e.pageX - scrollContainerRef.current.offsetLeft;
		const walk = (x - startX) * 2; // Множитель для скорости скролла
		scrollContainerRef.current.scrollLeft = scrollLeft - walk;
	};

	// Добавляем обработчики событий мыши на window для корректной работы драга
	useEffect(() => {
		if (isDragging) {
			const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e);
			const mouseUpHandler = () => handleMouseUp();

			window.addEventListener("mousemove", mouseMoveHandler);
			window.addEventListener("mouseup", mouseUpHandler);
			return () => {
				window.removeEventListener("mousemove", mouseMoveHandler);
				window.removeEventListener("mouseup", mouseUpHandler);
			};
		}
	}, [isDragging, startX, scrollLeft]);

	// Обработка окончания драга
	const handleMouseUp = () => {
		if (!scrollContainerRef.current) return;

		setIsDragging(false);
		scrollContainerRef.current.style.cursor = canScroll ? "grab" : "default";
		scrollContainerRef.current.style.userSelect = "auto";
	};

	// Обработка ухода мыши за пределы контейнера
	const handleMouseLeave = () => {
		if (!scrollContainerRef.current) return;

		setIsDragging(false);
		scrollContainerRef.current.style.cursor = canScroll ? "grab" : "default";
		scrollContainerRef.current.style.userSelect = "auto";
	};

	return (
		<div
			ref={scrollContainerRef}
			className={`${styles.scrollableTableWrapper} ${canScroll ? styles.canScroll : ""} ${isDragging ? styles.isDragging : ""} ${className}`}
			onMouseDown={handleMouseDown}
			onMouseLeave={handleMouseLeave}
		>
			{children}
		</div>
	);
}
