// src\app\service-booking\ServiceBookingContent.tsx

"use client";

import { useState, FormEvent } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styles from "./styles.module.scss";

export default function ServiceBookingContent() {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [selectedTime, setSelectedTime] = useState<string>("");
	const [selectedService, setSelectedService] = useState<string>("");
	const [name, setName] = useState<string>("");
	const [phone, setPhone] = useState<string>("");
	const [comment, setComment] = useState<string>("");

	const timeSlots: string[] = Array.from({ length: 18 }, (_, i) => {
		const hours = Math.floor(i / 2) + 10;
		const minutes = i % 2 === 0 ? "00" : "30";
		return `${hours}:${minutes}`;
	});

	const services: string[] = ["Замена масла", "Комплексное ТО", "Диагностика двигателя", "Шиномонтаж"];

	// Типизированный submit
	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!selectedDate || !selectedTime || !selectedService || !name || !phone) {
			alert("Пожалуйста, заполните все обязательные поля!");
			return;
		}

		const bookingData = {
			date: selectedDate.toISOString().split("T")[0],
			time: selectedTime,
			service: selectedService,
			name,
			phone,
			comment,
		};

		try {
			const res = await fetch("/api/booking", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(bookingData),
			});

			const result = await res.json();

			if (res.ok) {
				alert("Заявка успешно отправлена!");
				// Очистка формы
				setSelectedDate(new Date());
				setSelectedTime("");
				setSelectedService("");
				setName("");
				setPhone("");
				setComment("");
			} else {
				alert(result.error || "Ошибка отправки");
			}
		} catch (error) {
			console.error("Ошибка при отправке:", error);
			alert("Произошла ошибка. Попробуйте позже.");
		}
	};

	return (
		<form className={styles.bookingForm} onSubmit={handleSubmit}>
			<div className={styles.timeBlock}>
				<div className={styles.blockDescription}>Выберите удобную дату и время для прохождения ТО:</div>
				<div className={styles.calendarWrapper}>
					<Calendar onChange={(date: Date) => setSelectedDate(date)} value={selectedDate} minDate={new Date()} />
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

				<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Введите ваше имя" required />

				<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" required />

				<textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Дополнительная информация" />

				<button type="submit" className={`button ${styles.button}`}>
					Записаться
				</button>
			</div>
		</form>
	);
}
