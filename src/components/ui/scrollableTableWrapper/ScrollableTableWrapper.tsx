"use client";

import React from "react";
import styles from "./ScrollableTableWrapper.module.scss";

interface ScrollableTableWrapperProps {
	children: React.ReactNode;
	className?: string;
}

/** Обёртка таблицы — скролл через .tableContent.adminTableDragScroll */
export default function ScrollableTableWrapper({ children, className = "" }: ScrollableTableWrapperProps) {
	return <div className={`${styles.scrollableTableWrapper} ${className}`.trim()}>{children}</div>;
}
