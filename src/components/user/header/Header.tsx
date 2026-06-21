// src\components\user\header\Header.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { formatPhoneDisplay } from "@/lib/phoneUtils";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import styles from "./styles.module.scss";
import LoginPopup from "@/components/user/loginPopup/LoginPopup";
import OrderPopup from "@/components/user/orderPopup/OrderPopup";

const NAV_ITEMS = [
	{ label: "Материалы для ТО", path: "/categories" },
	{ label: "Комплекты ТО", path: "/service-kits" },
	{ label: "Запись на ТО", path: "/booking" },
	{ label: "Запчасти", path: "/products" },
	{ label: "Акции", path: "/promotions" },
	{ label: "Контакты", path: "/contacts" },
] as const;

function isNavItemActive(pathname: string, path: string): boolean {
	if (path === "/products") {
		return pathname === "/products" || pathname.startsWith("/products/") || pathname === "/catalog" || pathname.startsWith("/catalog/");
	}

	return pathname === path || pathname.startsWith(`${path}/`);
}

export default function Header() {
	const { isLogined, user, initAuth, logout } = useAuthStore();
	const { activateLoginPopup, setHeaderHeight } = useUiStore();
	const { getTotalItems, items } = useCartStore(); // Получаем функцию для подсчета товаров и список товаров
	const siteSettings = useSiteSettings();
	const totalItems = getTotalItems(); // Получаем общее количество товаров в корзине
	const router = useRouter();
	const pathname = usePathname();
	const logoUrl = siteSettings?.logoUrl ?? null;

	const isHomePage = pathname === "/";
	const isCartPage = pathname === "/cart";
	const isProfilePage = pathname === "/profile" || pathname.startsWith("/profile/");

	const [activeBurger, setActiveBurger] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false); // Состояние для анимации корзины
	const [mounted, setMounted] = useState(false); // Флаг монтирования для избежания SSR-гидратации
	const headerRef = useRef<HTMLDivElement>(null);
	const getDisplayName = () => {
		if (!user) return "Загрузка...";

		// Собираем ФИО в правильном порядке: Фамилия, Имя, Отчество
		const nameParts = [];

		if (user.last_name) nameParts.push(user.last_name);
		if (user.first_name) nameParts.push(user.first_name);
		if (user.middle_name) nameParts.push(user.middle_name);

		// Если есть хотя бы фамилия и имя, показываем ФИО
		if (nameParts.length >= 2) {
			return nameParts.join(" ");
		}

		// Если есть только одно поле, показываем его
		if (nameParts.length === 1) {
			return nameParts[0];
		}

		// Если нет имени, форматируем номер телефона
		return formatPhoneDisplay(user.phone);
	};

	// Авторизация при загрузке + актуальная высота шапки (мобильная панель меняется при открытии меню)
	useEffect(() => {
		initAuth();
	}, [initAuth]);

	useEffect(() => {
		const updateHeaderHeight = () => {
			if (headerRef.current) {
				setHeaderHeight(headerRef.current.clientHeight);
			}
		};

		updateHeaderHeight();
		window.addEventListener("resize", updateHeaderHeight);

		return () => window.removeEventListener("resize", updateHeaderHeight);
	}, [setHeaderHeight, activeBurger]);

	const renderCartButton = (extraClassName?: string) => (
		<div
			className={[styles.cart, extraClassName, isCartPage ? styles.headerActionActive : ""].filter(Boolean).join(" ")}
			onClick={() => router.push("/cart")}
			role="button"
			tabIndex={0}
			aria-label={mounted && totalItems > 0 ? `Корзина, ${totalItems} товаров` : "Корзина"}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					router.push("/cart");
				}
			}}
		>
			<div className={`${styles.cartIcon} ${isAnimating ? styles.cartAnimating : ""}`}>
				<svg width={25} height={25} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
					<g clipPath="url(#clipCartHeader)">
						<path
							d="M9.07812 18.1018H23.8987C24.2657 18.1018 24.5876 17.8591 24.6869 17.5066L27.9684 6.02203C28.0389 5.77444 27.9906 5.50848 27.8353 5.30276C27.6798 5.09769 27.438 4.97656 27.1799 4.97656H7.18436L6.59796 2.33789C6.51465 1.96213 6.1814 1.69531 5.79688 1.69531H0.820312C0.367004 1.69531 0 2.06232 0 2.51562C0 2.96915 0.367004 3.33594 0.820312 3.33594H5.13849L8.1008 16.666C7.22922 17.045 6.61719 17.9125 6.61719 18.9221C6.61719 20.279 7.72119 21.383 9.07812 21.383H23.8987C24.3522 21.383 24.719 21.0162 24.719 20.5627C24.719 20.1094 24.3522 19.7424 23.8987 19.7424H9.07812C8.62631 19.7424 8.25781 19.3748 8.25781 18.9221C8.25781 18.4694 8.62631 18.1018 9.07812 18.1018Z"
							fill="currentColor"
						/>
						<path
							d="M8.25781 23.8438C8.25781 25.2009 9.36182 26.3047 10.719 26.3047C12.0759 26.3047 13.1799 25.2009 13.1799 23.8438C13.1799 22.4868 12.0759 21.3828 10.719 21.3828C9.36182 21.3828 8.25781 22.4868 8.25781 23.8438Z"
							fill="currentColor"
						/>
						<path
							d="M19.7969 23.8438C19.7969 25.2009 20.9009 26.3047 22.2578 26.3047C23.615 26.3047 24.7188 25.2009 24.7188 23.8438C24.7188 22.4868 23.615 21.3828 22.2578 21.3828C20.9009 21.3828 19.7969 22.4868 19.7969 23.8438Z"
							fill="currentColor"
						/>
					</g>
					<defs>
						<clipPath id="clipCartHeader">
							<rect width="28" height="28" fill="white" />
						</clipPath>
					</defs>
				</svg>
			</div>
			{mounted && totalItems > 0 && <span className={styles.cartBadge}>{totalItems > 99 ? "99+" : totalItems}</span>}
		</div>
	);

	// Флаг монтирования (избегаем несоответствия SSR/CSR по количеству товаров)
	useEffect(() => {
		setMounted(true);
	}, []);

	// Анимация корзины при добавлении товара
	// Отслеживаем общее количество товаров, а не длину массива
	const prevTotalItems = useRef(totalItems);
	useEffect(() => {
		if (totalItems > prevTotalItems.current) {
			setIsAnimating(true);
			const timer = setTimeout(() => {
				setIsAnimating(false);
			}, 500); // Длительность анимации 0.5 секунды

			prevTotalItems.current = totalItems;
			return () => clearTimeout(timer);
		}
		prevTotalItems.current = totalItems;
	}, [totalItems]);

	return (
		<>
			<div className={`${styles.background} ${activeBurger ? styles.active : ""}`} onClick={() => setActiveBurger(false)} />
			<header
				className={[
					styles.header,
					activeBurger ? styles.active : "",
					isHomePage ? styles.headerHome : styles.headerInner,
				]
					.filter(Boolean)
					.join(" ")}
				ref={headerRef}
			>
				<div className={styles.brandAccent} aria-hidden="true" />

				<div className={styles.mobileToolbar}>
					{logoUrl ?
						<Link href="/" className={styles.mobileToolbarLogo} onClick={() => setActiveBurger(false)}>
							<img src={logoUrl} alt="Логотип" />
						</Link>
					:	<span className={styles.mobileToolbarLogoFallback} aria-hidden />}

					<div className={styles.mobileToolbarActions}>
						{renderCartButton()}
						<button
							type="button"
							className={[styles.menuButton, activeBurger ? styles.menuButtonActive : ""].filter(Boolean).join(" ")}
							aria-expanded={activeBurger}
							aria-label={activeBurger ? "Закрыть меню" : "Открыть меню"}
							onClick={() => setActiveBurger((value) => !value)}
						>
							<span className={styles.menuButtonLines} aria-hidden="true">
								<span className={styles.menuButtonLine} />
								<span className={styles.menuButtonLine} />
								<span className={styles.menuButtonLine} />
							</span>
						</button>
					</div>
				</div>

				<div className={styles.headerContent}>
					<div className={styles.leftBlock}>
						{logoUrl && (
							<Link href="/" className={styles.logo}>
								<img src={logoUrl} alt="Логотип" />
							</Link>
						)}
					</div>
					<div className={styles.centerBlock}>
						{NAV_ITEMS.map((item) => {
							const isActive = isNavItemActive(pathname, item.path);

							return (
								<Link
									key={item.path}
									href={item.path}
									className={[styles.navLi, isActive ? styles.navLiActive : ""].filter(Boolean).join(" ")}
									aria-current={isActive ? "page" : undefined}
									onClick={() => setActiveBurger(false)}
								>
									{item.label}
								</Link>
							);
						})}
					</div>
					<div className={styles.rightBlock}>
						{isLogined ? (
							<div className={styles.loginBlock}>
								<div className={styles.loginBlockRow}>
									<div className={styles.logout} onClick={logout}>
										<div className={styles.logoutIcon}>
											<img src="/images/logoutIcon.svg" alt="Выход" />
										</div>
										<div className={styles.logoutText}>Выйти</div>
									</div>
									<Link
										href="/profile"
										className={[styles.userBlock, isProfilePage ? styles.headerActionActive : ""].filter(Boolean).join(" ")}
										onClick={() => setActiveBurger(false)}
										aria-current={isProfilePage ? "page" : undefined}
									>
										<div className={styles.userIcon}>
											<img src="/images/userIcon.svg" alt="" />
										</div>
										<div className={styles.userName}>{getDisplayName()}</div>
									</Link>
								</div>
								{(user?.role === "admin" || user?.role === "superadmin" || user?.role === "manager") && (
									<button type="button" className={styles.adminPanelLink} onClick={() => router.push("/admin/dashboard")}>
										Вход в админ панель
									</button>
								)}
							</div>
						) : (
							<div className={styles.buttons} onClick={activateLoginPopup}>
								<div className={`button ${styles.button}`}>Войти</div>
							</div>
						)}
						{siteSettings?.headerPhone && (
							<div className={styles.contacts}>
								<div className={styles.phone}>
									<div className={styles.phoneIcon}>
										<img src="/images/phoneIcon.svg" alt="Телефон" />
									</div>
									<a className={styles.phoneNumber} href={`tel:${siteSettings.headerPhone.replace(/\D/g, "").replace(/^8/, "7")}`}>
										{formatPhoneDisplay(siteSettings.headerPhone)}
									</a>
								</div>
							</div>
						)}
						{renderCartButton(styles.drawerCart)}
					</div>
				</div>
			</header>

			<LoginPopup />
			<OrderPopup />
		</>
	);
}
