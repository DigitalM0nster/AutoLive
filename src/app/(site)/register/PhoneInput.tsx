"use client";

import styles from "./styles.module.scss";
import PhoneInputField from "@/components/ui/phoneInput/PhoneInput";

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

export default function PhoneInput({
	phone,
	setPhone,
	setFormattedPhone,
	setIsCodeSent,
	setPhoneError,
	phoneError,
	setExpiresIn,
}: PhoneInputProps) {
	const sendCode = async () => {
		if (phone.length !== 10) {
			setPhoneError("Введите корректный номер телефона");
			return;
		}
		try {
			const response = await fetch("/api/user/register/send-code", {
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
				if (data.devCode) {
					alert(`Код подтверждения (режим разработки): ${data.devCode}`);
				}
			} else {
				setPhoneError(data.error || "Ошибка при отправке кода");
				if (data.remainingTime) setIsCodeSent(true);
			}
		} catch {
			setPhoneError("Ошибка сети. Попробуйте снова");
		}
	};

	return (
		<div className={styles.inputBlock}>
			<div className={styles.inputName}>Введите телефон</div>
			<div className={styles.inputPhone}>
				<PhoneInputField
					value={phone}
					onValueChange={(raw, formatted) => {
						setPhone(raw);
						setFormattedPhone(formatted);
					}}
					placeholder="+7 (___) ___-__-__"
				/>
			</div>
			<div className={`button ${styles.button}`} onClick={sendCode}>
				Отправить код
			</div>
			{phoneError && <div className={styles.error}>{phoneError}</div>}
		</div>
	);
}
