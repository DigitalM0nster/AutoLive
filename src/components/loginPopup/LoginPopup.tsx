"use client";

import { useEffect, useState } from "react";
import styles from "./styles.module.scss";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import Link from "next/link";
import type { ChangeEvent, FormEvent } from "react";

export default function LoginPopup() {
	const { login } = useAuthStore();
	const { isActiveLoginPopup, deactivateLoginPopup } = useUiStore();
	const [phone, setPhone] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const [formattedPhone, setFormattedPhone] = useState<string>("");
	const [noPassword, setNoPassword] = useState<boolean>(false);

	// Ошибки
	const [phoneError, setPhoneError] = useState<string>("");
	const [passwordError, setPasswordError] = useState<string>("");

	// Сообщение о ресете
	const [resetSuccessMessage, setResetSuccessMessage] = useState<string>("");

	// Обработчик ввода номера
	const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
		const input = e.target as HTMLInputElement;
		const inputType = (e.nativeEvent as InputEvent).inputType;
		const isDeleting = inputType === "deleteContentBackward";
		let rawValue = e.target.value.replace(/\D/g, ""); // Убираем все нецифровые символы

		// Убираем лишнюю 7, если пользователь ввёл её вручную
		if (rawValue.startsWith("7")) {
			rawValue = rawValue.slice(1);
		}

		// Оставляем максимум 10 цифр
		rawValue = rawValue.slice(0, 10);

		// Определяем, где был курсор перед изменением
		const cursorPos = input.selectionStart;

		// Формируем маску с введёнными цифрами
		let mask = "+7 (___) ___-__-__".split("");
		let digitIndex = 0;
		for (let i = 0; i < mask.length; i++) {
			if (mask[i] === "_" && digitIndex < rawValue.length) {
				mask[i] = rawValue[digitIndex];
				digitIndex++;
			}
		}
		let newFormatted = mask.join("");

		// Логика перемещения курсора
		let newCursorPos = cursorPos;

		if (isDeleting) {
			// При удалении сдвигаем курсор влево, пока не наткнёмся на цифру
			while (newCursorPos > 4 && !/\d/.test(newFormatted[newCursorPos - 1])) {
				newCursorPos--;
			}
		} else {
			// При вводе курсор ставится после последней введённой цифры
			newCursorPos = newFormatted.indexOf("_");
			if (newCursorPos === -1) {
				newCursorPos = newFormatted.length; // Если все цифры введены, ставим в конец
			}
		}

		// Если все цифры удалены, курсор остаётся после "+7 "
		if (rawValue.length === 0) {
			newCursorPos = 4;
		}

		setPhone(rawValue);
		setFormattedPhone(newFormatted);

		// Восстанавливаем позицию курсора после рендера
		setTimeout(() => {
			input.setSelectionRange(newCursorPos, newCursorPos);
		}, 0);
	};

	// Функция логина
	const handleLogin = async (): Promise<void> => {
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
			await login(phone, password);
			deactivateLoginPopup(); // Закрываем попап после успешного входа
		} catch (error) {
			switch (error.message) {
				case "USER_NOT_FOUND":
					setPhoneError("Пользователь не найден");
					break;
				case "INVALID_PASSWORD":
					setPasswordError("Неверный пароль");
					break;
				case "MISSING_CREDENTIALS":
					setPasswordError("Введите телефон и пароль");
					break;
				case "SERVER_ERROR":
					setPasswordError("Ошибка сервера, попробуйте позже");
					break;
				default:
					setPasswordError("Неизвестная ошибка");
			}
		}
	};

	// Функция восстановления пароля
	const handlePasswordReset = async (): Promise<void> => {
		setPhoneError("");
		setResetSuccessMessage("");

		if (phone.length !== 10) {
			setPhoneError("Введите корректный номер телефона");
			return;
		}

		try {
			const response = await fetch("/api/user/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone }),
			});
			const data = await response.json();

			if (response.ok) {
				console.log("Новый пароль:", data.newPassword); // Выводим в консоль (в будущем заменим на SMS)
				setResetSuccessMessage(`Новый пароль отправлен на номер: ${formattedPhone}.`);
			} else {
				if (response.status === 400) {
					setPhoneError("Введите телефон");
				} else if (response.status === 404) {
					setPhoneError("Пользователь не найден");
				} else {
					setPhoneError("Ошибка сервера, попробуйте позже");
				}
			}
		} catch (error) {
			setPhoneError("Ошибка сети, попробуйте позже");
		}
	};

	useEffect(() => {
		setPhoneError("");
	}, [phone, formattedPhone]);

	useEffect(() => {
		setPasswordError("");
	}, [password]);

	return (
		<>
			<div className={`${styles.background} ${isActiveLoginPopup ? styles.active : ""}`} onClick={deactivateLoginPopup} />
			<div className={`${styles.loginPopup} ${styles.popup} ${isActiveLoginPopup ? styles.active : ""}`}>
				<div className={styles.titleBlock}>
					<div className={styles.title}>{noPassword ? "Восстановление пароля" : "Вход"}</div>
				</div>
				{noPassword ? (
					<div className={styles.inputsBlock}>
						{!resetSuccessMessage ? (
							<>
								<div className={styles.inputBlock}>
									<div
										className={`${styles.additionalButton} ${styles.backButton}`}
										onClick={() => {
											setResetSuccessMessage(null);
											setNoPassword(false);
										}}
									>
										← Вернуться ко входу
									</div>
									<input type="tel" value={formattedPhone} onChange={handlePhoneChange} placeholder="+7 (___) ___-__-__" />
									{phoneError && <div className={styles.errorMessage}>{phoneError}</div>}
									{resetSuccessMessage && <div className={styles.successMessage}>{resetSuccessMessage}</div>}
								</div>
								<div className={`button ${styles.button}`} onClick={handlePasswordReset}>
									Восстановить пароль
								</div>
							</>
						) : (
							<>
								<div className={styles.inputBlock}>
									<div
										className={`${styles.additionalButton} ${styles.backButton}`}
										onClick={() => {
											setNoPassword(false);
											setResetSuccessMessage(null);
										}}
									>
										← Вернуться ко входу
									</div>
									{resetSuccessMessage && <div className={styles.successMessage}>{resetSuccessMessage}</div>}
								</div>
							</>
						)}
					</div>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault(); // ✅ Предотвращаем обновление страницы
							handleLogin();
						}}
						className={styles.inputsBlock}
					>
						<div className={`${styles.inputBlock} ${phoneError ? styles.error : ""}`}>
							<input type="tel" value={formattedPhone} onChange={handlePhoneChange} placeholder="+7 (___) ___-__-__" autoComplete="username" />
							{phoneError && <div className={styles.errorMessage}>{phoneError}</div>}
						</div>

						<div className={`${styles.inputBlock} ${passwordError ? styles.error : ""}`}>
							<input type="password" placeholder="Введите пароль" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
							{passwordError && <div className={styles.errorMessage}>{passwordError}</div>}
						</div>

						<button type="submit" className={`button ${styles.button}`}>
							Войти
						</button>
						<div
							className={`${styles.additionalButton} ${styles.noPassword}`}
							onClick={() => {
								setNoPassword(true);
							}}
						>
							Не помню пароль
						</div>
					</form>
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
