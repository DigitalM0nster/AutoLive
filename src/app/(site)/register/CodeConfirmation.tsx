// src\app\register\CodeConfirmation.tsx

"use client";

import styles from "./styles.module.scss";

interface CodeConfirmationProps {
	phone: string;
	code: string[];
	expiresIn: number;
	codeError: string;
	setCode: (val: string[]) => void;
	setCodeError: (val: string) => void;
	onConfirm: (phone: string, code: string) => void;
	onBack: () => void;
}

export default function CodeConfirmation({ phone, code, expiresIn, codeError, setCode, setCodeError, onConfirm, onBack }: CodeConfirmationProps) {
	const handleCodeChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value.replace(/\D/g, "");
		setCodeError("");
		const newCode = [...code];

		if (value) {
			newCode[index] = value.slice(-1);
			setCode(newCode);
			if (index < code.length - 1) {
				setTimeout(() => document.getElementById(`code-input-${index + 1}`)?.focus(), 0);
			}
		} else {
			newCode[index] = "";
			setCode(newCode);
			if (index > 0) {
				setTimeout(() => document.getElementById(`code-input-${index - 1}`)?.focus(), 0);
			}
		}
	};

	const confirm = () => {
		const fullCode = code.join("");
		if (fullCode.length !== 4) {
			setCodeError("Введите полный код");
			return;
		}
		onConfirm(phone, fullCode);
	};

	return (
		<div className={styles.inputBlock}>
			<div className={styles.inputName}>Введите код</div>
			<div className={styles.inputCode}>
				{code.map((digit, index) => (
					<input
						key={index}
						id={`code-input-${index}`}
						type="text"
						pattern="[0-9]*"
						inputMode="numeric"
						value={digit}
						onChange={(e) => handleCodeChange(index, e)}
						maxLength={1}
					/>
				))}
			</div>
			{expiresIn > 0 && <div className={styles.timer}>Код истечёт через {expiresIn} сек.</div>}
			<div className={`button ${styles.button}`} onClick={confirm}>
				Подтвердить регистрацию
			</div>
			<div className={styles.backButton} onClick={onBack}>
				← Вернуться к началу регистрации
			</div>
			{codeError && <div className={styles.error}>{codeError}</div>}
		</div>
	);
}
