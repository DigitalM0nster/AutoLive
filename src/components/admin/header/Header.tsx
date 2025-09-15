"use client";

import Loading from "@/components/ui/loading/Loading";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/admin/breadcrumbs/Breadcrumbs";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link"; // Добавляем импорт Link
import "./styles.scss";

const getRoleName = (role: string) => {
	switch (role) {
		case "superadmin":
			return "Суперадмин";
		case "admin":
			return "Админ";
		case "manager":
			return "Менеджер";
		case "client":
			return "Пользователь";
		default:
			return role;
	}
};

export default function Header() {
	const router = useRouter();
	const { user, logout, initAuth } = useAuthStore();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		initAuth().finally(() => setLoading(false));
	}, [initAuth]);

	const handleLogout = async () => {
		await fetch("/api/admin/auth/logout", { method: "POST" });
		logout();
		router.push("/admin/login");
	};

	return (
		<header id="admin-header" className="header">
			<div className="headerContainer">
				{loading ? (
					<Loading />
				) : user ? (
					<Link href={`/admin/users/${user.id}`} className="userProfile">
						<div className="userIcon">
							<img src="/images/user_placeholder.png" alt="avatar" className="userAvatar" />
						</div>
						<div className="userDetails">
							<span className="userRole">
								{getRoleName(user.role)}
								{(user.role === "admin" || user.role === "manager") && user.department?.name && <> — Отдел: {user.department.name}</>}
							</span>
							<span>
								{user.last_name ? `${user.last_name} ` : ""}
								{user.first_name || ""}
								{user.middle_name ? ` ${user.middle_name}` : ""}
								{!user.first_name && !user.last_name ? "Пользователь" : ""}
							</span>
						</div>
					</Link>
				) : (
					<span>🔐 Войдите в свою учетную запись</span>
				)}

				{!loading && user && (
					<button onClick={handleLogout} className="logoutButton">
						Выйти
					</button>
				)}
			</div>
			<Breadcrumbs />
		</header>
	);
}
