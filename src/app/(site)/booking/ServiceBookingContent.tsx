// src\app\booking\ServiceBookingContent.tsx

"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styles from "./styles.module.scss";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import PersonalDataConsent from "@/components/user/personalDataConsent/PersonalDataConsent";

// Тип для отдела для записей
type BookingDepartment = {
	id: number;
	name: string | null;
	address: string;
	phones: string[];
	emails: string[];
};

function digitsFromPhone(phone: string): string {
	return phone.replace(/\D/g, "");
}

export default function ServiceBookingContent() {
	const { user, role, initAuth } = useAuthStore();

	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [selectedTime, setSelectedTime] = useState<string>("");
	const [selectedService, setSelectedService] = useState<string>("");
	const [selectedDepartmentId, setSelectedDepartmentId] = useState<number>(0);
	const [name, setName] = useState<string>("");
	const [phoneRaw, setPhoneRaw] = useState<string>(""); // Сырое значение телефона (цифры)
	const [phoneFormatted, setPhoneFormatted] = useState<string>(""); // Форматированное значение
	const [comment, setComment] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [departments, setDepartments] = useState<BookingDepartment[]>([]);
	const [loadingDepartments, setLoadingDepartments] = useState(true);
	const [personalDataConsent, setPersonalDataConsent] = useState(false);
	const [consentShowError, setConsentShowError] = useState(false);

	const timeSlots: string[] = Array.from({ length: 18 }, (_, i) => {
		const hours = Math.floor(i / 2) + 10;
		const minutes = i % 2 === 0 ? "00" : "30";
		return `${hours}:${minutes}`;
	});

	const services: string[] = ["Замена масла", "Комплексное ТО", "Диагностика двигателя", "Шиномонтаж"];

	const prefillFromClient = useCallback(() => {
		if (role !== "client" || !user) return;
		const parts = [user.first_name, user.last_name].filter(Boolean);
		if (parts.length) {
			setName((prev) => (prev.trim() === "" ? parts.join(" ") : prev));
		}
		const d = digitsFromPhone(user.phone || "");
		if (d.length >= 10) {
			setPhoneRaw((prev) => (prev.length < 10 ? d : prev));
		}
	}, [role, user]);

	// Сессия: чтобы привязать запись к ЛК (cookie уходит на POST)
	useEffect(() => {
		void initAuth().then(() => prefillFromClient());
	}, [initAuth, prefillFromClient]);

	// Загрузка списка отделов для записей
	useEffect(() => {
		const fetchDepartments = async () => {
			try {
				const res = await fetch("/api/booking-departments/public");
				if (res.ok) {
					const data = await res.json();
					setDepartments(Array.isArray(data) ? data : []);
				} else {
					console.error("Ошибка загрузки отделов");
					showErrorToast("Не удалось загрузить список отделов");
				}
			} catch (error) {
				console.error("Ошибка при загрузке отделов:", error);
				showErrorToast("Ошибка при загрузке списка отделов");
			} finally {
				setLoadingDepartments(false);
			}
		};

		fetchDepartments();
	}, []);

	// Обработчик изменения даты
	const handleDateChange = (value: any) => {
		if (value instanceof Date) {
			setSelectedDate(value);
		}
	};

	// Обработчик изменения телефона
	const handlePhoneChange = (rawValue: string, formattedValue: string) => {
		setPhoneRaw(rawValue);
		setPhoneFormatted(formattedValue);
	};

	// Типизированный submit
	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// Валидация обязательных полей
		if (!selectedDate || !selectedTime) {
			showErrorToast("Выберите дату и время записи");
			return;
		}

		if (!selectedDepartmentId || selectedDepartmentId === 0) {
			showErrorToast("Выберите отдел для записи");
			return;
		}

		if (!name || name.trim() === "") {
			showErrorToast("Введите ваше имя");
			return;
		}

		if (!phoneRaw || phoneRaw.length < 10) {
			showErrorToast("Введите корректный номер телефона");
			return;
		}

		if (!personalDataConsent) {
			setConsentShowError(true);
			showErrorToast("Нужно согласие на обработку персональных данных");
			return;
		}
		setConsentShowError(false);

		// Формируем notes: добавляем тип услуги и комментарий
		let notes = "";
		if (selectedService) {
			notes = `Тип услуги: ${selectedService}`;
		}
		if (comment && comment.trim()) {
			notes = notes ? `${notes}\n\n${comment.trim()}` : comment.trim();
		}

		// Подготавливаем данные для отправки в формате, ожидаемом API
		const bookingData = {
			scheduledDate: selectedDate.toISOString().split("T")[0], // Формат YYYY-MM-DD
			scheduledTime: selectedTime, // Формат HH:MM
			bookingDepartmentId: selectedDepartmentId,
			contactPhone: phoneRaw, // Сырое значение телефона (цифры)
			clientName: name.trim(),
			notes: notes || undefined, // Примечания (опционально)
			personal_data_consent: true as const,
		};

		setLoading(true);
		try {
			const res = await fetch("/api/bookings/public", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(bookingData),
			});

			const result = await res.json();

			if (res.ok) {
				showSuccessToast("Запись успешно отправлена! Мы свяжемся с вами для подтверждения.");
				// Очистка формы
				setSelectedDate(new Date());
				setSelectedTime("");
				setSelectedService("");
				setSelectedDepartmentId(0);
				setName("");
				setPhoneRaw("");
				setPhoneFormatted("");
				setComment("");
				// После сброса состояния снова подставить данные из аккаунта
				queueMicrotask(() => prefillFromClient());
			} else {
				showErrorToast(result.error || "Ошибка отправки");
			}
		} catch (error) {
			console.error("Ошибка при отправке:", error);
			showErrorToast("Произошла ошибка. Попробуйте позже.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form className={styles.bookingForm} onSubmit={handleSubmit}>
			<div className={styles.timeBlock}>
				<div className={styles.blockDescription}>Выберите удобную дату и время для прохождения ТО:</div>
				<div className={styles.calendarWrapper}>
					<Calendar onChange={handleDateChange} value={selectedDate} minDate={new Date()} />
				</div>
				<select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} required disabled={loading}>
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
				{role === "client" && <div className={styles.blockDescription}>Запись будет отображаться в вашем личном кабинете.</div>}

				{/* Выбор отдела для записи */}
				<select
					value={selectedDepartmentId}
					onChange={(e) => setSelectedDepartmentId(Number(e.target.value))}
					required
					disabled={loading || loadingDepartments}
				>
					<option value={0} disabled>
						{loadingDepartments ? "Загрузка отделов..." : "Выберите отдел"}
					</option>
					{departments.map((dept) => (
						<option key={dept.id} value={dept.id}>
							{dept.name || dept.address}
							{dept.name && dept.address ? ` - ${dept.address}` : ""}
						</option>
					))}
				</select>

				{/* Выбор типа услуги */}
				<select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} disabled={loading}>
					<option value="" disabled>
						Выберите сервис (необязательно)
					</option>
					{services.map((service) => (
						<option key={service} value={service}>
							{service}
						</option>
					))}
				</select>

				{/* Имя клиента */}
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Введите ваше имя"
					required
					disabled={loading}
				/>

				{/* Телефон с использованием PhoneInput */}
				<PhoneInput
					value={phoneFormatted}
					onValueChange={handlePhoneChange}
					placeholder="+7 (___) ___-__-__"
					required
					disabled={loading}
				/>

				{/* Дополнительная информация */}
				<textarea
					value={comment}
					onChange={(e) => setComment(e.target.value)}
					placeholder="Дополнительная информация"
					disabled={loading}
				/>

				<PersonalDataConsent
					id="booking-pd-consent"
					wrapperClassName={styles.consentBlock}
					checked={personalDataConsent}
					onChange={(v) => {
						setPersonalDataConsent(v);
						if (v) setConsentShowError(false);
					}}
					showError={consentShowError}
				/>

				<button type="submit" className={`button ${styles.button}`} disabled={loading}>
					{loading ? "Отправка..." : "Записаться"}
				</button>
			</div>
		</form>
	);
}
