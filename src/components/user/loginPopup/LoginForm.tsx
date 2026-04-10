// src/components/user/loginPopup/LoginForm.tsx
// Телефон без PatternFormat: только цифры (10), префикс +7 отдельно — так не ломается курсор на планшетах.

import { useState, FormEvent } from "react";
import styles from "./styles.module.scss";

interface LoginFormProps {
	onLogin: (phone: string, password: string) => Promise<void>;
	switchToReset: () => void;
}

/** Оставляем до 10 цифр после кода страны; поддержка вставки +7… / 8… */
function normalizeLoginPhoneDigits(raw: string): string {
	let d = raw.replace(/\D/g, "");
	if (d.length === 11 && d.startsWith("7")) d = d.slice(1);
	if (d.length === 11 && d.startsWith("8")) d = d.slice(1);
	return d.slice(0, 10);
}

export default function LoginForm({ onLogin, switchToReset }: LoginFormProps) {
	const [phone, setPhone] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const [phoneError, setPhoneError] = useState<string>("");
	const [passwordError, setPasswordError] = useState<string>("");

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setPhoneError("");
		setPasswordError("");

		if (phone.length !== 10) {
			setPhoneError("Введите корректный номер телефона");
			return;
		}
		if (!password) {
			setPasswordError("Введите пароль");
			return;
		}

		try {
			await onLogin(phone, password);
		} catch (error: any) {
			const errorCode = error.code || error.message;
			if (errorCode === "USER_NOT_FOUND") {
				setPhoneError("Пользователь не найден");
			} else if (errorCode === "INVALID_PASSWORD") {
				setPasswordError("Неверный пароль");
			} else {
				setPasswordError("Ошибка входа");
			}
		}
	};

	return (
		<form onSubmit={handleSubmit} className={styles.inputsBlock}>
			<div className={styles.inputBlock}>
				<div className={styles.phoneRow}>
					<span className={styles.phonePrefix} aria-hidden>
						+7
					</span>
					<input
						id="login-phone"
						type="tel"
						name="phone"
						inputMode="numeric"
						autoComplete="tel-national"
						placeholder="9123456789"
						value={phone}
						onChange={(e) => setPhone(normalizeLoginPhoneDigits(e.target.value))}
						className={styles.inputField}
						aria-label="Телефон, 10 цифр без кода страны"
					/>
				</div>
				{phoneError && <div className={styles.errorMessage}>{phoneError}</div>}
			</div>
			<div className={styles.inputBlock}>
				<input type="password" placeholder="Введите пароль" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
				{passwordError && <div className={styles.errorMessage}>{passwordError}</div>}
			</div>
			<button type="submit" className={`button ${styles.button}`}>
				Войти
			</button>
			<div className={styles.additionalButton} onClick={switchToReset}>
				Не помню пароль
			</div>
		</form>
	);
}
