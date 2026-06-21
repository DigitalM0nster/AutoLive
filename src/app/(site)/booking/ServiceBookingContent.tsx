// src\app\booking\ServiceBookingContent.tsx

"use client";

import { useState, FormEvent, useEffect, useCallback, useMemo, useRef } from "react";
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
	const [submitSuccess, setSubmitSuccess] = useState(false);
	const authBootstrapped = useRef(false);

	const minCalendarDate = useMemo(() => {
		const date = new Date();
		date.setHours(0, 0, 0, 0);
		return date;
	}, []);

	const timeSlots: string[] = useMemo(
		() =>
			Array.from({ length: 18 }, (_, i) => {
				const hours = Math.floor(i / 2) + 10;
				const minutes = i % 2 === 0 ? "00" : "30";
				return `${hours}:${minutes}`;
			}),
		[],
	);

	const isSelectedDateToday = useMemo(() => {
		const today = new Date();
		return selectedDate.toDateString() === today.toDateString();
	}, [selectedDate]);

	const isTimeSlotDisabled = useCallback(
		(time: string) => {
			if (!isSelectedDateToday) return false;

			const [hours, minutes] = time.split(":").map(Number);
			const now = new Date();

			return hours < now.getHours() || (hours === now.getHours() && minutes <= now.getMinutes());
		},
		[isSelectedDateToday],
	);

	const availableTimeSlots = useMemo(
		() => timeSlots.filter((time) => !isTimeSlotDisabled(time)),
		[timeSlots, isTimeSlotDisabled],
	);

	const selectedDateShort = useMemo(
		() =>
			selectedDate.toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "long",
			}),
		[selectedDate],
	);

	const canSubmit = useMemo(
		() =>
			Boolean(selectedDate) &&
			selectedTime !== "" &&
			selectedDepartmentId > 0 &&
			name.trim() !== "" &&
			phoneRaw.length >= 10 &&
			personalDataConsent &&
			!loadingDepartments,
		[selectedDate, selectedTime, selectedDepartmentId, name, phoneRaw, personalDataConsent, loadingDepartments],
	);

	const missingFields = useMemo(() => {
		const items: string[] = [];

		if (!selectedTime) {
			items.push(availableTimeSlots.length > 0 ? "Время записи" : "Другую дату со свободным временем");
		}

		if (loadingDepartments) {
			items.push("Загрузка списка отделов");
		} else if (selectedDepartmentId <= 0) {
			items.push("Отдел");
		}

		if (!name.trim()) {
			items.push("Имя");
		}

		if (phoneRaw.length < 10) {
			items.push("Телефон");
		}

		if (!personalDataConsent) {
			items.push("Согласие на обработку данных");
		}

		return items;
	}, [
		selectedTime,
		availableTimeSlots.length,
		loadingDepartments,
		selectedDepartmentId,
		name,
		phoneRaw,
		personalDataConsent,
	]);

	const showSubmitHint = !loading && !canSubmit && missingFields.length > 0;

	useEffect(() => {
		if (selectedTime && isTimeSlotDisabled(selectedTime)) {
			setSelectedTime("");
		}
	}, [selectedDate, selectedTime, isTimeSlotDisabled]);

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

	// Сессия один раз — иначе initAuth + prefill зацикливали /api/user/session
	useEffect(() => {
		if (authBootstrapped.current) return;
		authBootstrapped.current = true;
		void initAuth();
	}, [initAuth]);

	useEffect(() => {
		prefillFromClient();
	}, [prefillFromClient]);

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

	const handleDateChange = (value: unknown) => {
		if (value instanceof Date) {
			setSelectedDate(value);
			setSelectedTime("");
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
				setSubmitSuccess(true);
				showSuccessToast("Ваша заявка успешно отправлена");
				window.scrollTo({ top: 0, behavior: "smooth" });
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
			{submitSuccess && <div className={styles.successMessage}>Ваша заявка успешно отправлена</div>}
			<div className={styles.timeBlock}>
				<div className={styles.schedulePanel}>
					<div className={styles.scheduleStepHeader}>
						<span className={styles.scheduleStepNumber}>1</span>
						<div className={styles.scheduleStepText}>
							<h3 className={styles.scheduleStepTitle}>Дата и время</h3>
							<p className={styles.scheduleStepHint}>Выберите удобный день в календаре, затем — время записи</p>
						</div>
					</div>

					<div className={styles.calendarWrapper}>
						<Calendar onChange={handleDateChange} value={selectedDate} minDate={minCalendarDate} />
					</div>

					<div className={styles.timeSection}>
						<p className={styles.timeSectionLabel}>Время</p>
						<p className={styles.timeSectionHint}>
							{availableTimeSlots.length > 0
								? isSelectedDateToday
									? "Свободные окна на сегодня"
									: `Свободные окна на ${selectedDateShort}`
								: "На выбранную дату свободного времени не осталось — выберите другой день"}
						</p>

						{availableTimeSlots.length > 0 ? (
							<div className={styles.timeSlotGrid} role="listbox" aria-label="Выбор времени записи">
								{availableTimeSlots.map((time) => {
									const isActive = selectedTime === time;

									return (
										<button
											key={time}
											type="button"
											role="option"
											aria-selected={isActive}
											disabled={loading}
											className={[styles.timeSlot, isActive ? styles.timeSlotActive : ""].filter(Boolean).join(" ")}
											onClick={() => setSelectedTime(time)}
										>
											{time}
										</button>
									);
								})}
							</div>
						) : (
							<div className={styles.timeEmptyState}>Попробуйте выбрать завтра или другой удобный день в календаре.</div>
						)}
					</div>

					<div className={styles.scheduleSummary} aria-live="polite">
						<div className={styles.scheduleSummaryItem}>
							<span className={styles.scheduleSummaryLabel}>Дата</span>
							<span className={styles.scheduleSummaryValue}>{selectedDateShort}</span>
						</div>
						<div className={styles.scheduleSummaryDivider} aria-hidden="true" />
						<div className={styles.scheduleSummaryItem}>
							<span className={styles.scheduleSummaryLabel}>Время</span>
							<span className={selectedTime ? styles.scheduleSummaryValue : styles.scheduleSummaryPlaceholder}>
								{selectedTime || "Не выбрано"}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className={styles.inputsBlock}>
				<div className={styles.scheduleStepHeader}>
					<span className={styles.scheduleStepNumber}>2</span>
					<div className={styles.scheduleStepText}>
						<h3 className={styles.scheduleStepTitle}>Контактные данные</h3>
						<p className={styles.scheduleStepHint}>Оставьте информацию для подтверждения записи</p>
					</div>
				</div>
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
					value={phoneRaw}
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

				<div className={[styles.submitWrap, showSubmitHint ? styles.submitWrapBlocked : ""].filter(Boolean).join(" ")}>
					<button type="submit" className={`button ${styles.button}`} disabled={loading || !canSubmit} aria-describedby={showSubmitHint ? "booking-submit-hint" : undefined}>
						{loading ? "Отправка..." : "Записаться"}
					</button>

					{showSubmitHint && (
						<div className={styles.submitHint} id="booking-submit-hint" role="tooltip">
							<p className={styles.submitHintTitle}>Чтобы записаться, укажите:</p>
							<ul className={styles.submitHintList}>
								{missingFields.map((field) => (
									<li key={field}>{field}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			</div>
		</form>
	);
}
