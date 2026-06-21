"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import { formatPhoneDisplay } from "@/lib/phoneUtils";
import { canAccessSiteProfile } from "@/lib/siteProfileAccess";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { displayProfileName } from "./profileUiUtils";
import styles from "./profileArea.module.scss";

const NAV = [
	{ href: "/profile", label: "Обзор", hint: "Сводка и быстрые действия" },
	{ href: "/profile/orders", label: "Заказы", hint: "История заявок" },
	{ href: "/profile/bookings", label: "Записи на ТО", hint: "Сервисные визиты" },
	{ href: "/profile/settings", label: "Профиль", hint: "Данные и безопасность" },
] as const;

function navClass(pathname: string, href: string): string {
	if (href === "/profile") {
		return pathname === "/profile" ? styles.navLinkActive : "";
	}
	return pathname === href || pathname.startsWith(`${href}/`) ? styles.navLinkActive : "";
}

export default function ProfileShell({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const { initAuth, user, role } = useAuthStore();
	const activateLoginPopup = useUiStore((state) => state.activateLoginPopup);
	const [ready, setReady] = useState(false);

	const gate = useCallback(async () => {
		await initAuth();
		const { isLogined, role, user } = useAuthStore.getState();
		if (!isLogined || !canAccessSiteProfile(role ?? user?.role)) {
			if (!isLogined) {
				activateLoginPopup();
			}
			router.replace("/");
			return;
		}
		setReady(true);
	}, [activateLoginPopup, initAuth, router]);

	useEffect(() => {
		void gate();
	}, [gate]);

	if (!ready) {
		return (
			<div className={`screen ${styles.screen}`}>
				<div className="screenContent">
					<NavigationMenu />
					<div className={styles.cabinetLayout}>
						<aside className={`${styles.cabinetSidebar} ${styles.skeletonSidebar}`}>
							<div className={`${styles.skeletonBlock} ${styles.skeletonShimmer}`} />
							<div className={`${styles.skeletonBlock} ${styles.skeletonShimmer}`} />
						</aside>
						<main className={styles.cabinetMain}>
							<div className={`${styles.skeletonTitle} ${styles.skeletonShimmer}`} />
							<div className={`${styles.skeletonCard} ${styles.skeletonShimmer}`} />
						</main>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />

				<div className={styles.cabinetLayout}>
					<aside className={styles.cabinetSidebar}>
						<div className={styles.userCard}>
							<div className={styles.userAvatar} aria-hidden="true" />
							<div className={styles.userName}>{user ? displayProfileName(user) : "Клиент"}</div>
							{user?.phone ?
								<div className={styles.userPhone}>{formatPhoneDisplay(user.phone)}</div>
							:	null}
						</div>

						<nav className={styles.cabinetNav} aria-label="Разделы личного кабинета">
							{NAV.map((item) => (
								<Link key={item.href} href={item.href} className={`${styles.navLink} ${navClass(pathname, item.href)}`.trim()}>
									<span className={styles.navLinkLabel}>{item.label}</span>
									<span className={styles.navLinkHint}>{item.hint}</span>
								</Link>
							))}
						</nav>

						<div className={styles.sidebarFooter}>
							{(role === "admin" || role === "superadmin" || role === "manager") && (
								<Link href="/admin/dashboard" className={styles.sidebarActionSecondary}>
									Админ-панель
								</Link>
							)}
							<Link href="/cart" className={styles.sidebarAction}>
								Корзина
							</Link>
							<Link href="/" className={styles.sidebarActionSecondary}>
								На сайт
							</Link>
						</div>
					</aside>

					<main className={styles.cabinetMain}>{children}</main>
				</div>
			</div>
		</div>
	);
}
