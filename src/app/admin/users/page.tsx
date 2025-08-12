// src\app\admin\users\page.tsx
"use client";

import { useState, useEffect } from "react";
import AllUsersTable from "./local_components/AllUsersTable";
import { useAuthStore } from "@/store/authStore";
import styles from "./local_components/styles.module.scss";
import { useRouter } from "next/navigation";
import Link from "next/link";

const UsersPage = () => {
	const { user } = useAuthStore();
	const router = useRouter();

	// Функция для перехода на страницу создания нового пользователя
	const handleCreateUser = () => {
		router.push("/admin/users/create");
	};

	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<div className={`tabButton active`}>Список пользователей</div>
					<Link href="/admin/users/logs" className={`tabButton`}>
						История изменений
					</Link>
				</div>

				<AllUsersTable />
			</div>
		</div>
	);
};

export default UsersPage;
