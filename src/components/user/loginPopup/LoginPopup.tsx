// src/components/loginPopup/LoginPopup.tsx

"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import PasswordResetForm from "./PasswordResetForm";
import styles from "./styles.module.scss";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import Link from "next/link";

export default function LoginPopup() {
	const { login } = useAuthStore();
	const { isActiveLoginPopup, deactivateLoginPopup } = useUiStore();
	const [isResetMode, setIsResetMode] = useState<boolean>(false);

	// Функция для восстановления пароля
	const handlePasswordReset = async (phone: string) => {
		// Пример запроса на восстановление пароля
		const response = await fetch("/api/user/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ phone }),
		});
		const data = await response.json();
		if (response.ok) {
			return { newPassword: data.newPassword };
		} else {
			throw new Error("Reset failed");
		}
	};

	// Функция для логина
	const handleLogin = async (phone: string, password: string) => {
		await login(phone, password);
		deactivateLoginPopup(); // Закрываем попап после успешного входа
	};

	return (
		<>
			<div className={`${styles.background} ${isActiveLoginPopup ? styles.active : ""}`} onClick={deactivateLoginPopup} />
			<div className={`${styles.loginPopup} ${styles.popup} ${isActiveLoginPopup ? styles.active : ""}`}>
				{isResetMode ? (
					<PasswordResetForm onReset={handlePasswordReset} switchToLogin={() => setIsResetMode(false)} />
				) : (
					<LoginForm onLogin={handleLogin} switchToReset={() => setIsResetMode(true)} />
				)}
				<div className={styles.additionalBlock}>
					<div className={styles.additionalText}>Нет учетной записи?</div>
					<Link href="/register" className={styles.additionalButton} onClick={deactivateLoginPopup}>
						Зарегистрироваться
					</Link>
				</div>
				<div className={styles.closeIcon} onClick={deactivateLoginPopup}>
					<div className={styles.line} />
					<div className={styles.line} />
				</div>
			</div>
		</>
	);
}
