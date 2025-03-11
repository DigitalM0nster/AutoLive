"use client";

import { useState } from "react";
import Calendar from "react-calendar"; // Импортируем кастомный календарь
import "react-calendar/dist/Calendar.css"; // Стили библиотеки
import styles from "./styles.module.scss";

export default function ServiceBookingContent() {
	const [selectedDate, setSelectedDate] = useState(new Date()); // Дата (по умолчанию сегодня)
	const [selectedTime, setSelectedTime] = useState(""); // Время
	const [selectedService, setSelectedService] = useState(""); // Сервис
	const [name, setName] = useState(""); // Имя пользователя
	const [phone, setPhone] = useState(""); // Телефон
	const [comment, setComment] = useState(""); // Комментарий

	// Доступные временные промежутки (30 минут с 10:00 до 19:00)
	const timeSlots = Array.from({ length: 18 }, (_, i) => {
		const hours = Math.floor(i / 2) + 10;
		const minutes = i % 2 === 0 ? "00" : "30";
		return `${hours}:${minutes}`;
	});

	// Доступные сервисы (пока статичный список, позже можно загружать с API)
	const services = ["Замена масла", "Комплексное ТО", "Диагностика двигателя", "Шиномонтаж"];

	// Функция отправки заявки
	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!selectedDate || !selectedTime || !selectedService || !name || !phone) {
			alert("Пожалуйста, заполните все обязательные поля!");
			return;
		}

		const bookingData = {
			date: selectedDate.toISOString().split("T")[0], // Преобразуем дату в строку (YYYY-MM-DD)
			time: selectedTime,
			service: selectedService,
			name,
			phone,
			comment,
		};

		console.log("Данные для отправки:", bookingData);
		alert("Заявка успешно отправлена!");
	};

	return (
		<form className={styles.bookingForm} onSubmit={handleSubmit}>
			<div className={styles.timeBlock}>
				<div className={styles.blockDescription}>Выберите удобную дату и время для прохождения ТО:</div>
				<div className={styles.calendarWrapper}>
					<Calendar onChange={setSelectedDate} value={selectedDate} minDate={new Date()} />
				</div>
				<select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} required>
					<option value="" disabled>
						Выберите время
					</option>
					{timeSlots.map((time) => (
						<option key={time} value={time}>
							{time}
						</option>
					))}
				</select>
			</div>

			<div className={styles.inputsBlock}>
				<div className={styles.blockDescription}>Оставьте свои данные для подтверждения записи:</div>
				{/* Выбор сервиса */}
				<select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} required>
					<option value="" disabled>
						Выберите сервис
					</option>
					{services.map((service) => (
						<option key={service} value={service}>
							{service}
						</option>
					))}
				</select>

				{/* Ввод имени */}
				<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Введите ваше имя" required />

				{/* Ввод телефона */}
				<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" required />

				{/* Комментарий */}
				<textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Дополнительная информация" />

				{/* Кнопка отправки */}
				<button type="submit" className={`button ${styles.button}`}>
					Записаться
				</button>
			</div>
		</form>
	);
}
