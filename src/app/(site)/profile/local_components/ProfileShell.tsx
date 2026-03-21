"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import { useAuthStore } from "@/store/authStore";
import styles from "./profileArea.module.scss";

const NAV = [
	{ href: "/profile", label: "Обзор" },
	{ href: "/profile/orders", label: "Заказы" },
	{ href: "/profile/bookings", label: "Записи на ТО" },
	{ href: "/profile/settings", label: "Профиль и безопасность" },
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
	const { initAuth } = useAuthStore();
	const [ready, setReady] = useState(false);

	const gate = useCallback(async () => {
		await initAuth();
		const { isLogined, role } = useAuthStore.getState();
		if (!isLogined || role !== "client") {
			router.replace("/");
			return;
		}
		setReady(true);
	}, [initAuth, router]);

	useEffect(() => {
		void gate();
	}, [gate]);

	if (!ready) {
		return (
			<div className={`screen ${styles.screen}`}>
				<div className="screenContent">
					<NavigationMenu />
					<div className={styles.layoutInner}>
						<p className={styles.redirectNote}>Загрузка личного кабинета…</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<div className={styles.layoutInner}>
					<nav className={styles.cabinetNav} aria-label="Разделы личного кабинета">
						{NAV.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={`${styles.navLink} ${navClass(pathname, item.href)}`.trim()}
							>
								{item.label}
							</Link>
						))}
					</nav>
					{children}
				</div>
			</div>
		</div>
	);
}
