// src\components\user\header\Header.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import styles from "./styles.module.scss";
import LoginPopup from "@/components/user/loginPopup/LoginPopup";
import OrderPopup from "@/components/user/orderPopup/OrderPopup";

export default function Header() {
	const { isLogined, user, initAuth, logout } = useAuthStore();
	const { activateLoginPopup, setHeaderHeight } = useUiStore();
	const { getTotalItems, items } = useCartStore(); // Получаем функцию для подсчета товаров и список товаров
	const siteSettings = useSiteSettings();
	const totalItems = getTotalItems(); // Получаем общее количество товаров в корзине
	const router = useRouter();
	const logoUrl = siteSettings?.logoUrl ?? null;

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
		const formattedPhone = user.phone.replace(/(\d{3})(\d{3})(\d{2})(\d{2})$/, "($1) $2-$3-$4");
		return `+7 ${formattedPhone}`;
	};

	// Авторизация при загрузке
	useEffect(() => {
		initAuth();
		setTimeout(() => {
			setHeaderHeight(headerRef.current?.clientHeight || 100);
		}, 100);
	}, [initAuth]);

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
			<div className={`${styles.header} ${activeBurger ? styles.active : ""}`} ref={headerRef}>
				<div className={styles.headerContent}>
					<div className={styles.leftBlock}>
						{logoUrl && (
							<div className={styles.logo} onClick={() => router.push("/")}>
								<img src={logoUrl} alt="Логотип" />
							</div>
						)}
						{(user?.role === "admin" || user?.role === "superadmin" || user?.role === "manager") && (
							<div className={styles.dashboardButton} onClick={() => router.push("/admin/dashboard")}>
								Вход в админ панель
							</div>
						)}
					</div>
					<div className={styles.centerBlock}>
						{[
							{ label: "Материалы для ТО", path: "/categories" },
							{ label: "Комплекты ТО", path: "/service-kits" },
							{ label: "Запись на ТО", path: "/booking" },
							{ label: "Запчасти", path: "/catalog" },
							{ label: "Акции", path: "/promotions" },
							{ label: "Контакты", path: "/contacts" },
						].map((item) => (
							<div key={item.path} className={styles.navLi} onClick={() => router.push(item.path)}>
								{item.label}
							</div>
						))}
					</div>
					<div className={styles.rightBlock}>
						{isLogined ? (
							<div className={styles.loginBlock}>
								<div className={styles.logout} onClick={logout}>
									<div className={styles.logoutIcon}>
										<img src="/images/logoutIcon.svg" alt="Выход" />
									</div>
									<div className={styles.logoutText}>Выйти</div>
								</div>
								<div className={styles.userBlock}>
									<div
										className={styles.user}
										onClick={() => {
											if (user?.role === "client") router.push("/profile");
										}}
										role={user?.role === "client" ? "button" : undefined}
										tabIndex={user?.role === "client" ? 0 : undefined}
										onKeyDown={(e) => {
											if (user?.role === "client" && (e.key === "Enter" || e.key === " ")) {
												e.preventDefault();
												router.push("/profile");
											}
										}}
									>
										<div className={styles.userIcon}>
											<img src="/images/userIcon.svg" alt="Пользователь" />
										</div>
										<div className={styles.userName}>{getDisplayName()}</div>
									</div>
								</div>
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
									<div className={styles.phoneNumber}>{siteSettings.headerPhone}</div>
								</div>
							</div>
						)}
						<div className={styles.cart} onClick={() => router.push("/cart")}>
							<div className={`${styles.cartIcon} ${isAnimating ? styles.cartAnimating : ""}`}>
								{/* Inline SVG + currentColor — из --site-color-accent (админка: акцентирующий) */}
								<svg
									width={25}
									height={25}
									viewBox="0 0 28 28"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									role="img"
									aria-label="Корзина"
								>
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
							<div className={styles.cartNumber} suppressHydrationWarning>
								{mounted ? `(${totalItems})` : "(0)"}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className={`${styles.mobileBurger} ${activeBurger ? styles.active : ""}`} onClick={() => setActiveBurger(!activeBurger)}>
				<div className={styles.lines}>
					<div className={styles.line} />
					<div className={styles.line} />
					<div className={styles.line} />
				</div>
			</div>

			<LoginPopup />
			<OrderPopup />
		</>
	);
}
