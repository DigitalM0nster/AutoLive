"use client";

import Link from "next/link";
import { useState } from "react";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/ToastProvider";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";
import AdminAuthShell from "../local_components/AdminAuthShell";
import styles from "../AdminAuth.module.scss";

export default function AdminResetPasswordForm() {
	const [phone, setPhone] = useState("");
	const [error, setError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [loading, setLoading] = useState(false);

	const handlePasswordReset = async () => {
		setError("");
		setSuccessMessage("");

		if (phone.trim().length < 10) {
			setError("Введите корректный номер телефона");
			showErrorToast("Введите корректный номер телефона");
			return;
		}

		if (loading) return;
		setLoading(true);

		try {
			const response = await fetch("/api/admin/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone }),
			});
			const data = await response.json();
			setLoading(false);

			if (!response.ok) {
				setError(data.error || "Ошибка сервера, попробуйте позже");
				showErrorToast(data.error || "Ошибка сервера, попробуйте позже");
				return;
			}

			if (data.newPassword) {
				showSuccessToast(`Новый пароль: ${data.newPassword}`);
			}

			setSuccessMessage("Пароль сброшен. Используйте новый пароль для входа в панель.");
		} catch {
			setLoading(false);
			setError("Ошибка сети, попробуйте позже");
			showErrorToast("Ошибка сети, попробуйте позже");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			void handlePasswordReset();
		}
	};

	return (
		<AdminAuthShell
			formTitle="Восстановление пароля"
			formLead="Укажите телефон учётной записи сотрудника с доступом к панели — администратора или менеджера"
			backHref="/admin"
			backLabel="Вернуться ко входу"
			footer={
				<Link href="/admin" className={styles.footerLink}>
					Вспомнили пароль? Войти
				</Link>
			}
		>
			<div className={styles.form}>
				<div className={styles.field}>
					<label className={styles.fieldLabel} htmlFor="admin-reset-phone">
						Телефон
					</label>
					<PhoneInput
						id="admin-reset-phone"
						value={phone}
						onValueChange={(rawValue: string) => {
							setPhone(rawValue);
							setError("");
							setSuccessMessage("");
						}}
						inputClassName={[styles.fieldInput, error ? styles.hasError : ""].filter(Boolean).join(" ")}
						onKeyDown={handleKeyDown}
						autoComplete="tel"
					/>
					{error ? <p className={styles.fieldError}>{error}</p> : null}
				</div>

				{successMessage ? <p className={styles.successMessage}>{successMessage}</p> : null}

				<button type="button" className={styles.submitButton} onClick={() => void handlePasswordReset()} disabled={loading}>
					{loading ? "Сброс…" : "Сбросить пароль"}
				</button>
			</div>
		</AdminAuthShell>
	);
}
