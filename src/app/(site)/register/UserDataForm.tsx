"use client";

import { ChangeEvent } from "react";
import styles from "./styles.module.scss";

interface UserDataFormProps {
	userData: {
		first_name: string;
		last_name: string;
		middle_name: string;
	};
	setUserData: (data: { first_name: string; last_name: string; middle_name: string }) => void;
	onSubmit: () => void;
	onBack: () => void;
	error: string;
}

export default function UserDataForm({ userData, setUserData, onSubmit, onBack, error }: UserDataFormProps) {
	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setUserData({ ...userData, [name]: value });
	};

	const handleSubmit = () => {
		onSubmit();
	};

	return (
		<div className={styles.inputBlock}>
			<div className={styles.inputName}>Введите ваши данные</div>

			<div className={styles.formField}>
				<label htmlFor="last_name">Фамилия</label>
				<input type="text" id="last_name" name="last_name" value={userData.last_name} onChange={handleChange} placeholder="Введите фамилию" />
			</div>

			<div className={styles.formField}>
				<label htmlFor="first_name">Имя</label>
				<input type="text" id="first_name" name="first_name" value={userData.first_name} onChange={handleChange} placeholder="Введите имя" />
			</div>

			<div className={styles.formField}>
				<label htmlFor="middle_name">Отчество</label>
				<input type="text" id="middle_name" name="middle_name" value={userData.middle_name} onChange={handleChange} placeholder="Введите отчество" />
			</div>

			<div className={`button ${styles.button}`} onClick={handleSubmit}>
				Завершить регистрацию
			</div>

			<div className={styles.backButton} onClick={onBack}>
				← Вернуться к вводу кода
			</div>

			{error && <div className={styles.error}>{error}</div>}
		</div>
	);
}
