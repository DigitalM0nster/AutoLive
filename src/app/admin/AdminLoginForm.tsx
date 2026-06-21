"use client";

import Link from "next/link";
import { useState } from "react";
import { showErrorToast } from "@/components/ui/toast/ToastProvider";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";
import AdminAuthShell from "./local_components/AdminAuthShell";
import styles from "./AdminAuth.module.scss";

export default function AdminLoginForm() {
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [phoneError, setPhoneError] = useState("");
	const [passwordError, setPasswordError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		setPhoneError("");
		setPasswordError("");

		let hasError = false;
		if (phone.trim() === "") {
			setPhoneError("Введите телефон");
			showErrorToast("Введите телефон");
			hasError = true;
		}
		if (password.trim() === "") {
			setPasswordError("Введите пароль");
			showErrorToast("Введите пароль");
			hasError = true;
		}
		if (hasError) return;

		if (loading) return;
		setLoading(true);

		try {
			const res = await fetch("/api/admin/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone, password }),
				credentials: "include",
			});

			const data = await res.json();
			setLoading(false);

			if (!res.ok) {
				if (data.error.toLowerCase().includes("телефон")) {
					setPhoneError(data.error);
				} else if (data.error.toLowerCase().includes("пароль")) {
					setPasswordError(data.error);
				}
				showErrorToast(data.error || "Ошибка авторизации");
			} else {
				setPhoneError("");
				setPasswordError("");
				window.location.href = "/admin/dashboard";
			}
		} catch {
			setLoading(false);
			showErrorToast("Ошибка сети, попробуйте позже");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			void handleLogin();
		}
	};

	return (
		<AdminAuthShell
			formTitle="Вход в панель"
			formLead="Для администраторов, менеджеров и других сотрудников с доступом к панели управления"
			footer={
				<Link href="/admin/reset-password" className={styles.footerLink}>
					Забыли пароль?
				</Link>
			}
		>
			<div className={styles.form}>
				<div className={styles.field}>
					<label className={styles.fieldLabel} htmlFor="admin-login-phone">
						Телефон
					</label>
					<PhoneInput
						id="admin-login-phone"
						value={phone}
						onValueChange={(rawValue: string) => setPhone(rawValue)}
						inputClassName={[styles.fieldInput, phoneError ? styles.hasError : ""].filter(Boolean).join(" ")}
						onKeyDown={handleKeyDown}
						autoComplete="tel"
					/>
					{phoneError ? <p className={styles.fieldError}>{phoneError}</p> : null}
				</div>

				<div className={styles.field}>
					<label className={styles.fieldLabel} htmlFor="admin-login-password">
						Пароль
					</label>
					<input
						id="admin-login-password"
						type="password"
						placeholder="Введите пароль"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						onKeyDown={handleKeyDown}
						autoComplete="current-password"
						className={[styles.fieldInput, passwordError ? styles.hasError : ""].filter(Boolean).join(" ")}
					/>
					{passwordError ? <p className={styles.fieldError}>{passwordError}</p> : null}
				</div>

				<button type="button" className={styles.submitButton} onClick={() => void handleLogin()} disabled={loading}>
					{loading ? "Вход…" : "Войти"}
				</button>
			</div>
		</AdminAuthShell>
	);
}
