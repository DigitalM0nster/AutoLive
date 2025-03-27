// src\app\register\PhoneInput.tsx

"use client";

import { ChangeEvent } from "react";
import styles from "./styles.module.scss";

interface PhoneInputProps {
	phone: string;
	formattedPhone: string;
	setPhone: (val: string) => void;
	setFormattedPhone: (val: string) => void;
	setIsCodeSent: (val: boolean) => void;
	setPhoneError: (val: string) => void;
	phoneError: string;
	setExpiresIn: (val: number) => void;
}

export default function PhoneInput({ phone, formattedPhone, setPhone, setFormattedPhone, setIsCodeSent, setPhoneError, phoneError, setExpiresIn }: PhoneInputProps) {
	const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
		const input = e.target;
		let rawValue = e.target.value.replace(/\D/g, "");
		if (rawValue.startsWith("7")) rawValue = rawValue.slice(1);
		rawValue = rawValue.slice(0, 10);

		let mask = "+7 (___) ___-__-__".split("");
		let digitIndex = 0;
		for (let i = 0; i < mask.length; i++) {
			if (mask[i] === "_" && digitIndex < rawValue.length) {
				mask[i] = rawValue[digitIndex];
				digitIndex++;
			}
		}
		const newFormatted = mask.join("");
		setPhone(rawValue);
		setFormattedPhone(newFormatted);
	};

	const sendCode = async () => {
		if (phone.length !== 10) {
			setPhoneError("Введите корректный номер телефона");
			return;
		}
		try {
			const response = await fetch("/api/user/auth/register/send-code", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone }),
			});
			const data = await response.json();
			if (response.ok) {
				setIsCodeSent(true);
				setExpiresIn(data.expiresIn);
				localStorage.setItem("phone", phone);
				localStorage.setItem("isCodeSent", "true");
				setPhoneError("");
			} else {
				setPhoneError(data.error || "Ошибка при отправке кода");
				if (data.remainingTime) setIsCodeSent(true);
			}
		} catch (error) {
			setPhoneError("Ошибка сети. Попробуйте снова");
		}
	};

	return (
		<div className={styles.inputBlock}>
			<div className={styles.inputName}>Введите телефон</div>
			<div className={styles.inputPhone}>
				<input type="tel" value={formattedPhone} onChange={handlePhoneChange} placeholder="+7 (___) ___-__-__" />
			</div>
			<div className={`button ${styles.button}`} onClick={sendCode}>
				Отправить код
			</div>
			{phoneError && <div className={styles.error}>{phoneError}</div>}
		</div>
	);
}
