// src\app\admin\users\page.tsx
"use client";

import { useState, useEffect } from "react";
import UsersTable from "./local_components/UsersTable";
import { useAuthStore } from "@/store/authStore";
import styles from "./styles.module.scss";
import { useRouter } from "next/navigation";
import Link from "next/link";

const UsersPage = () => {
	const [activeTab, setActiveTab] = useState<"users" | "logs">("users");
	const { user } = useAuthStore();
	const router = useRouter();

	useEffect(() => {
		setActiveTab("users");
	}, []);

	// Функция для перехода на страницу создания нового пользователя
	const handleCreateUser = () => {
		router.push("/admin/users/create");
	};

	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className="tableBlock">
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<button onClick={() => setActiveTab("users")} className={`${styles.tabButton} ${activeTab === "users" ? styles.active : styles.inactive}`}>
						Список пользователей
					</button>
					{/* Добавляем вкладку для логов пользователей, доступную только для админов и суперадминов */}
					{(user?.role === "superadmin" || user?.role === "admin") && (
						<Link href="/admin/users/logs" className={`${styles.tabButton} ${styles.inactive}`}>
							История изменений
						</Link>
					)}
				</div>

				{activeTab === "users" && (
					<>
						<UsersTable />
					</>
				)}
			</div>
			{/* Кнопка для создания нового пользователя */}
			{(user?.role === "superadmin" || user?.role === "admin") && (
				<button onClick={handleCreateUser} className={styles.createUserButton}>
					+ Создать пользователя
				</button>
			)}
		</div>
	);
};

export default UsersPage;
