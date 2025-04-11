// src/components/user/loginPopup/LoginForm.tsx

import { useState, FormEvent } from "react";
import styles from "./styles.module.scss";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";

interface LoginFormProps {
	onLogin: (phone: string, password: string) => Promise<void>;
	switchToReset: () => void;
}

export default function LoginForm({ onLogin, switchToReset }: LoginFormProps) {
	// Храним в состоянии только цифры (например, "9954091882")
	const [phone, setPhone] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const [phoneError, setPhoneError] = useState<string>("");
	const [passwordError, setPasswordError] = useState<string>("");

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setPhoneError("");
		setPasswordError("");

		// Ожидаем, что номер состоит ровно из 10 цифр
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
			// Если error.code отсутствует, используем error.message
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
				<PhoneInput value={phone} onValueChange={(rawValue: string, formattedValue: string) => setPhone(rawValue)} inputClassName={styles.inputField} />
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
