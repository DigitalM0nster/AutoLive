"use client";

import styles from "../local_components/styles.module.scss";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import AllUsersLogsComponent from "../local_components/AllUsersLogsComponent";

type UsersLogsProps = {
	userId?: number; // Опциональный параметр для фильтрации логов по конкретному пользователю
};

export default function UsersLogsPage({ userId }: UsersLogsProps) {
	const { user } = useAuthStore();

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<Link href="/admin/users/" className={`tabButton`}>
						Список пользователей
					</Link>
					<div className={`tabButton active`}>История изменений</div>
				</div>

				{/* Компонент с логами всех пользователей */}
				<AllUsersLogsComponent />
			</div>
		</div>
	);
}
