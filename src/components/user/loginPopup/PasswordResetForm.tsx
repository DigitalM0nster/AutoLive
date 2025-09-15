// src/components/loginPopup/PasswordResetForm.tsx

import { useState } from "react";
import styles from "./styles.module.scss";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";

interface PasswordResetFormProps {
	onReset: (phone: string) => Promise<{ newPassword?: string }>;
	switchToLogin: () => void;
}

export default function PasswordResetForm({ onReset, switchToLogin }: PasswordResetFormProps) {
	const [phone, setPhone] = useState<string>("");
	const [formattedPhone, setFormattedPhone] = useState<string>("+7 (___) ___-__-__");
	const [phoneError, setPhoneError] = useState<string>("");
	const [resetSuccessMessage, setResetSuccessMessage] = useState<string>("");

	const handleReset = async () => {
		setPhoneError("");
		setResetSuccessMessage("");

		if (phone.length !== 10) {
			setPhoneError("Введите корректный номер телефона");
			return;
		}
		try {
			const response = await onReset(phone);
			if (response.newPassword) {
				// Временно показываем пароль через alert
				alert(`Ваш новый пароль: ${response.newPassword}`);
				setResetSuccessMessage(`Новый пароль отправлен на номер: ${formattedPhone}.`);
			}
		} catch (error: any) {
			setPhoneError("Ошибка сервера, попробуйте позже");
		}
	};

	return (
		<div className={`${styles.inputsBlock} ${styles.resetForm}`}>
			<div className={`${styles.additionalButton} ${styles.backButton}`} onClick={switchToLogin}>
				← Вернуться ко входу
			</div>
			<div className={styles.inputBlock}>
				<PhoneInput
					value={phone}
					onValueChange={(rawValue, formattedValue) => {
						setPhone(rawValue);
						setFormattedPhone(formattedValue);
					}}
					inputClassName={styles.inputField}
				/>

				{phoneError && <div className={styles.errorMessage}>{phoneError}</div>}
				{resetSuccessMessage && <div className={styles.successMessage}>{resetSuccessMessage}</div>}
			</div>
			{!resetSuccessMessage && (
				<button type="button" className={`button ${styles.button}`} onClick={handleReset}>
					Восстановить пароль
				</button>
			)}
		</div>
	);
}
