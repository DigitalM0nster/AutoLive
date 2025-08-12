"use client";

import styles from "../local_components/styles.module.scss";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import AllDepartmentsLogsComponent from "../local_components/AllDepartmentsLogsComponent";

type DepartmentsLogsProps = {
	departmentId?: number; // Опциональный параметр для фильтрации логов по конкретному отделу
};

export default function DepartmentsLogsPage({ departmentId }: DepartmentsLogsProps) {
	return (
		<div className={`screenContent`}>
			<div className="tableContainer">
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<Link href="/admin/departments/" className={`tabButton`}>
						Список отделов
					</Link>
					<div className={`tabButton active`}>История изменений</div>
				</div>
				<AllDepartmentsLogsComponent />
			</div>
		</div>
	);
}
