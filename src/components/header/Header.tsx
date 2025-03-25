"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import styles from "./styles.module.scss";
import LoginPopup from "../loginPopup/LoginPopup";
import OrderPopup from "../orderPopup/OrderPopup";

export default function Header() {
	const { isLogined, token, role, initAuth, logout } = useAuthStore();
	const { activateLoginPopup } = useUiStore();
	const router = useRouter();

	const [activeBurger, setActiveBurger] = useState(false);
	const [userName, setUserName] = useState("");

	// Авторизация при загрузке
	useEffect(() => {
		initAuth();
	}, []);

	useEffect(() => {
		if (token) {
			fetchUserData();
		}
	}, [token]);

	// Получение имени пользователя
	const fetchUserData = async () => {
		try {
			const res = await fetch("/api/user/get-user-data", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			const data = await res.json();

			if (res.ok) {
				let displayName = "Загрузка...";

				if (data.firstName && data.lastName) {
					displayName = `${data.firstName} ${data.lastName}`;
				} else if (data.firstName) {
					displayName = data.firstName;
				} else if (data.lastName) {
					displayName = data.lastName;
				} else if (data.phone) {
					const formattedPhone = data.phone.replace(/(\d{3})(\d{3})(\d{2})(\d{2})$/, "($1) $2-$3-$4");
					displayName = `+7 ${formattedPhone}`;
				}

				setUserName(displayName);
			} else {
				console.error("Ошибка получения данных пользователя:", data.error);
			}
		} catch (error) {
			console.error("Ошибка:", error);
		}
	};

	return (
		<>
			<div className={`${styles.background} ${activeBurger ? styles.active : ""}`} onClick={() => setActiveBurger(false)} />
			<div className={`${styles.header} ${activeBurger ? styles.active : ""}`}>
				<div className={styles.headerContent}>
					<div className={styles.leftBlock}>
						<div className={styles.logo} onClick={() => router.push("/")}>
							<img src="/images/logo.svg" alt="Логотип" />
						</div>
					</div>
					<div className={styles.centerBlock}>
						{[
							{ label: "Материалы для ТО", path: "/service-materials" },
							{ label: "Комплекты ТО", path: "/service-kits" },
							{ label: "Запись на ТО", path: "/service-booking" },
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
									<div className={styles.userIcon}>
										<img src="/images/userIcon.svg" alt="Пользователь" />
									</div>
									<div className={styles.userName}>{userName || "Загрузка..."}</div>
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
						<div className={styles.cart}>
							<div className={styles.cartIcon}>
								<img src="/images/cartIcon.svg" alt="Корзина" />
							</div>
							<div className={styles.cartNumber}>(0)</div>
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
