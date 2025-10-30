// src\components\user\header\Header.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import styles from "./styles.module.scss";
import LoginPopup from "@/components/user/loginPopup/LoginPopup";
import OrderPopup from "@/components/user/orderPopup/OrderPopup";

export default function Header() {
	const { isLogined, user, initAuth, logout } = useAuthStore();
	const { activateLoginPopup, setHeaderHeight } = useUiStore();
	const { getTotalItems, items } = useCartStore(); // Получаем функцию для подсчета товаров и список товаров
	const totalItems = getTotalItems(); // Получаем общее количество товаров в корзине
	const router = useRouter();

	const [activeBurger, setActiveBurger] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false); // Состояние для анимации корзины
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
						<div className={styles.logo} onClick={() => router.push("/")}>
							<img src="/images/logo.svg" alt="Логотип" />
						</div>
						{user?.role === "admin" ||
							(user?.role === "superadmin" && (
								<div className={styles.dashboardButton} onClick={() => router.push("/admin/dashboard")}>
									Вход в админ панель
								</div>
							))}
					</div>
					<div className={styles.centerBlock}>
						{[
							{ label: "Материалы для ТО", path: "/service-materials" },
							{ label: "Комплекты ТО", path: "/service-kits" },
							{ label: "Запись на ТО", path: "/booking" },
							{ label: "Запчасти", path: "/catalog" },
							{ label: "Акции", path: "/discounts" },
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
									<div className={styles.user}>
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
						<div className={styles.contacts}>
							<div className={styles.phone}>
								<div className={styles.phoneIcon}>
									<img src="/images/phoneIcon.svg" alt="Телефон" />
								</div>
								<div className={styles.phoneNumber}>+7 (995) 409-18-82</div>
							</div>
						</div>
						<div className={styles.cart} onClick={() => router.push("/cart")}>
							<div className={`${styles.cartIcon} ${isAnimating ? styles.cartAnimating : ""}`}>
								<img src="/images/cartIcon.svg" alt="Корзина" />
							</div>
							<div className={styles.cartNumber}>({totalItems})</div>
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
