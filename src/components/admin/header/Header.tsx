"use client";

import { ExternalLink, LogOut } from "lucide-react";
import Loading from "@/components/ui/loading/Loading";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/admin/breadcrumbs/Breadcrumbs";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import CONFIG from "@/lib/config";
import AdminNavMenu from "./AdminNavMenu";
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

function getDisplayName(user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>) {
	const parts = [user.last_name, user.first_name, user.middle_name].filter(Boolean);
	if (parts.length > 0) return parts.join(" ");
	return "Пользователь";
}

export default function Header() {
	const router = useRouter();
	const pathname = usePathname();
	const { user, logout, initAuth } = useAuthStore();
	const [loading, setLoading] = useState(true);
	const [logoUrl, setLogoUrl] = useState<string | null>(null);

	const isAuthRoute = pathname === "/admin" || pathname === "/admin/reset-password";

	useEffect(() => {
		initAuth().finally(() => setLoading(false));
	}, [initAuth]);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/site-settings")
			.then((r) => (r.ok ? r.json() : null))
			.then((data: { logoUrl?: string | null } | null) => {
				if (!cancelled && data?.logoUrl) setLogoUrl(data.logoUrl);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	const handleLogout = async () => {
		await fetch("/api/admin/logout", { method: "POST" });
		logout();
		router.push("/admin");
	};

	// На страницах входа без авторизации шапка не нужна — форма занимает весь экран
	if (isAuthRoute && !user) {
		return null;
	}

	return (
		<header id="admin-header" className="adminHeader">
			<div className="brandAccent" aria-hidden="true" />

			<div className="headerInner">
				<div className="headerMain">
					<div className="brandBlock">
						<Link href="/admin/dashboard" className="brandLink" title="На главную панели">
							{logoUrl ? (
								<span className="logoWrap">
									<img src={logoUrl} alt={CONFIG.STORE_NAME} className="logo" />
								</span>
							) : (
								<span className="logoFallback">{CONFIG.STORE_NAME.charAt(0)}</span>
							)}
							<span className="brandText">
								<span className="brandTitle">Панель управления</span>
								<span className="brandStore">{CONFIG.STORE_NAME}</span>
							</span>
						</Link>
					</div>

					{!loading && user && (
						<nav className="adminNav" aria-label="Разделы админки">
							<AdminNavMenu role={user.role} />
						</nav>
					)}

					<div className="headerActions">
						{loading ? (
							<Loading />
						) : user ? (
							<>
								<Link href={`/admin/users/${user.id}`} className="userChip" title="Мой профиль">
									<span className="userAvatarWrap">
										<img src="/images/user_placeholder.png" alt="" className="userAvatar" />
									</span>
									<span className="userMeta">
										<span className="userName">{getDisplayName(user)}</span>
										<span className="userRole">
											{getRoleName(user.role)}
											{(user.role === "admin" || user.role === "manager") && user.department?.name && ` · ${user.department.name}`}
										</span>
									</span>
								</Link>

								<div className="actionGroup">
									<Link href="/" className="siteLink" title="Открыть сайт">
										<ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
										<span className="siteLinkText">На сайт</span>
									</Link>
									<div
										className="logout"
										onClick={handleLogout}
										role="button"
										tabIndex={0}
										title="Выйти из аккаунта"
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												void handleLogout();
											}
										}}
									>
										<LogOut size={15} strokeWidth={2} aria-hidden="true" />
										<span className="logoutText">Выйти</span>
									</div>
								</div>
							</>
						) : (
							<span className="loginHint">Войдите в учётную запись</span>
						)}
					</div>
				</div>

				<Breadcrumbs />
			</div>
		</header>
	);
}
