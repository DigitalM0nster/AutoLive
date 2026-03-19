"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookingDepartment } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";

type BookingDepartmentFormComponentProps = {
	isCreating?: boolean;
	bookingDepartmentId?: number;
	userRole?: string;
	initialData?: BookingDepartment;
};

export default function BookingDepartmentFormComponent({ isCreating = true, bookingDepartmentId, userRole, initialData }: BookingDepartmentFormComponentProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(!isCreating && !initialData);
	const [saving, setSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false); // Состояние для отслеживания изменений

	// Состояние формы
	const [formData, setFormData] = useState({
		name: initialData?.name || "",
		address: initialData?.address || "",
		phones: initialData?.phones || [],
		emails: initialData?.emails || [],
		workingHours: (initialData as any)?.workingHours ?? "",
		showOnContactsPage: (initialData as any)?.showOnContactsPage !== false,
		latitude: initialData?.latitude != null ? String(initialData.latitude) : "",
		longitude: initialData?.longitude != null ? String(initialData.longitude) : "",
	});

	// Начальные данные для сравнения (при редактировании)
	const [initialFormData, setInitialFormData] = useState({
		name: initialData?.name || "",
		address: initialData?.address || "",
		phones: initialData?.phones || [],
		emails: initialData?.emails || [],
		workingHours: (initialData as any)?.workingHours ?? "",
		showOnContactsPage: (initialData as any)?.showOnContactsPage !== false,
		latitude: initialData?.latitude != null ? String(initialData.latitude) : "",
		longitude: initialData?.longitude != null ? String(initialData.longitude) : "",
	});

	// Загрузка данных адреса (если редактирование)
	useEffect(() => {
		if (!isCreating && bookingDepartmentId && !initialData) {
			const fetchBookingDepartment = async () => {
				setLoading(true);
				try {
					const res = await fetch(`/api/booking-departments/${bookingDepartmentId}`, { credentials: "include" });
					if (!res.ok) {
						throw new Error("Ошибка загрузки адреса");
					}
					const data = await res.json();
					if (data) {
					const loadedData = {
						name: data.name || "",
						address: data.address || "",
						phones: data.phones || [],
						emails: data.emails || [],
						workingHours: data.workingHours ?? "",
						showOnContactsPage: data.showOnContactsPage !== false,
						latitude: data.latitude != null ? String(data.latitude) : "",
						longitude: data.longitude != null ? String(data.longitude) : "",
					};
						setFormData(loadedData);
						setInitialFormData(loadedData); // Сохраняем начальные данные для сравнения
					}
				} catch (err) {
					console.error("Ошибка загрузки адреса:", err);
					showErrorToast("Ошибка загрузки адреса");
				} finally {
					setLoading(false);
				}
			};

			fetchBookingDepartment();
		} else if (initialData) {
			// Если initialData передано напрямую, сохраняем его как начальные данные
			setInitialFormData({
				name: initialData.name || "",
				address: initialData.address || "",
				phones: initialData.phones || [],
				emails: initialData.emails || [],
				workingHours: (initialData as any).workingHours ?? "",
				showOnContactsPage: (initialData as any).showOnContactsPage !== false,
				latitude: initialData.latitude != null ? String(initialData.latitude) : "",
				longitude: initialData.longitude != null ? String(initialData.longitude) : "",
			});
		}
	}, [isCreating, bookingDepartmentId, initialData]);

	// Отслеживание изменений формы
	useEffect(() => {
		if (isCreating) {
			// При создании кнопки всегда видны (нет начальных данных для сравнения)
			setHasChanges(true);
			return;
		}

		// При редактировании сравниваем текущие данные с начальными
		const hasFormChanges =
			formData.name !== initialFormData.name ||
			formData.address !== initialFormData.address ||
			JSON.stringify(formData.phones) !== JSON.stringify(initialFormData.phones) ||
			JSON.stringify(formData.emails) !== JSON.stringify(initialFormData.emails) ||
			formData.workingHours !== initialFormData.workingHours ||
			formData.showOnContactsPage !== initialFormData.showOnContactsPage ||
			formData.latitude !== initialFormData.latitude ||
			formData.longitude !== initialFormData.longitude;

		setHasChanges(hasFormChanges);
	}, [formData, initialFormData, isCreating]);

	// Обработчик добавления телефона
	const handleAddPhone = () => {
		setFormData({
			...formData,
			phones: [...formData.phones, ""],
		});
	};

	// Обработчик удаления телефона
	const handleRemovePhone = (index: number) => {
		setFormData({
			...formData,
			phones: formData.phones.filter((_, i) => i !== index),
		});
	};

	// Обработчик изменения телефона
	const handlePhoneChange = (index: number, value: string) => {
		const newPhones = [...formData.phones];
		newPhones[index] = value;
		setFormData({
			...formData,
			phones: newPhones,
		});
	};

	// Обработчик добавления почты
	const handleAddEmail = () => {
		setFormData({
			...formData,
			emails: [...formData.emails, ""],
		});
	};

	// Обработчик удаления почты
	const handleRemoveEmail = (index: number) => {
		setFormData({
			...formData,
			emails: formData.emails.filter((_, i) => i !== index),
		});
	};

	// Обработчик изменения почты
	const handleEmailChange = (index: number, value: string) => {
		const newEmails = [...formData.emails];
		newEmails[index] = value;
		setFormData({
			...formData,
			emails: newEmails,
		});
	};

	// Обработчик сохранения
	const handleSave = async () => {
		// Валидация - address обязателен
		if (!formData.address.trim()) {
			showErrorToast("Адрес обязателен для заполнения");
			return;
		}

		// Фильтруем пустые телефоны
		const phones = formData.phones.filter((phone) => phone.trim() !== "");
		// Фильтруем пустые почты
		const emails = formData.emails.filter((email) => email.trim() !== "");

		setSaving(true);
		try {
			// Подготавливаем данные для отправки
			const requestData = {
				name: formData.name.trim() || null,
				address: formData.address.trim(),
				phones: phones,
				emails: emails,
				workingHours: formData.workingHours.trim() || null,
				showOnContactsPage: formData.showOnContactsPage,
				latitude: formData.latitude === "" ? null : Number(formData.latitude),
				longitude: formData.longitude === "" ? null : Number(formData.longitude),
			};

			let response;
			if (isCreating) {
				// Создание нового адреса
				response = await fetch("/api/booking-departments", {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestData),
				});
			} else {
				// Обновление существующего адреса
				response = await fetch(`/api/booking-departments/${bookingDepartmentId}`, {
					method: "PUT",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestData),
				});
			}

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка при сохранении адреса");
			}

			showSuccessToast(isCreating ? "Адрес успешно создан" : "Адрес успешно обновлен");

			// Сбрасываем состояние изменений
			setHasChanges(false);

			// Перенаправляем на список адресов
			router.push("/admin/booking-departments");
		} catch (err: any) {
			console.error("Ошибка при сохранении адреса:", err);
			showErrorToast(err.message || "Ошибка при сохранении адреса");
		} finally {
			setSaving(false);
		}
	};

	// Обработчик отмены
	const handleCancel = () => {
		if (!isCreating && initialFormData) {
			// Восстанавливаем исходные данные
			setFormData({
				name: initialFormData.name || "",
				address: initialFormData.address || "",
				phones: initialFormData.phones || [],
				emails: initialFormData.emails || [],
				workingHours: initialFormData.workingHours ?? "",
				showOnContactsPage: initialFormData.showOnContactsPage !== false,
				latitude: initialFormData.latitude ?? "",
				longitude: initialFormData.longitude ?? "",
			});
			setHasChanges(false);
		} else {
			// При создании просто перенаправляем
			router.push("/admin/booking-departments");
		}
	};

	if (loading) {
		return <Loading />;
	}

	return (
		<>
			<div className="formFields">
				{/* Название (опционально) */}
				<div className="formField">
					<label htmlFor="name">Название (описание)</label>
					<input
						type="text"
						id="name"
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						placeholder="Введите название адреса (необязательно)"
					/>
				</div>

				{/* Адрес (обязательно) */}
				<div className="formField">
					<label htmlFor="address">
						Адрес <span style={{ color: "var(--red-color)" }}>*</span>
					</label>
					<textarea
						id="address"
						value={formData.address}
						onChange={(e) => setFormData({ ...formData, address: e.target.value })}
						placeholder="Введите адрес"
						rows={3}
						required
					/>
				</div>

				{/* Координаты на карте (для Яндекс.Карт). Можно вставить из буфера формат «широта, долгота» (как в Яндексе). */}
				<div className="formField">
					<label>Координаты на карте (широта / долгота)</label>
					<div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
						<input
							type="number"
							step="any"
							value={formData.latitude}
							onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
							onPaste={(e) => {
								const text = (e.clipboardData?.getData("text") ?? "").trim();
								const match = text.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
								if (match) {
									e.preventDefault();
									setFormData((prev) => ({ ...prev, latitude: match[1]!, longitude: match[2]! }));
								}
							}}
							placeholder="Широта или вставьте «широта, долгота»"
						/>
						<input
							type="number"
							step="any"
							value={formData.longitude}
							onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
							onPaste={(e) => {
								const text = (e.clipboardData?.getData("text") ?? "").trim();
								const match = text.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
								if (match) {
									e.preventDefault();
									setFormData((prev) => ({ ...prev, latitude: match[1]!, longitude: match[2]! }));
								}
							}}
							placeholder="Долгота"
						/>
					</div>
				</div>

				{/* Телефоны (массив) */}
				<div className="formField">
					<label>Телефоны</label>
					<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
						{formData.phones.map((phone, index) => (
							<div key={index} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
								<input type="tel" value={phone} onChange={(e) => handlePhoneChange(index, e.target.value)} placeholder="+7(999)123-45-67" style={{ flex: 1 }} />
								<button type="button" onClick={() => handleRemovePhone(index)} className="removeButton" style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
									Удалить
								</button>
							</div>
						))}
						<button type="button" onClick={handleAddPhone} className="button">
							+ Добавить телефон
						</button>
					</div>
				</div>

				{/* Почты (массив) */}
				<div className="formField">
					<label>Почты</label>
					<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
						{formData.emails.map((email, index) => (
							<div key={index} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
								<input type="email" value={email} onChange={(e) => handleEmailChange(index, e.target.value)} placeholder="example@mail.com" style={{ flex: 1 }} />
								<button type="button" onClick={() => handleRemoveEmail(index)} className="removeButton" style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
									Удалить
								</button>
							</div>
						))}
						<button type="button" onClick={handleAddEmail} className="button">
							+ Добавить почту
						</button>
					</div>
				</div>

				{/* Режим работы */}
				<div className="formField">
					<label htmlFor="workingHours">Режим работы</label>
					<input
						id="workingHours"
						type="text"
						value={formData.workingHours}
						onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
						placeholder="Пн–Пт: 9:00–18:00, Сб–Вс: выходной"
					/>
					<p style={{ marginTop: 4, fontSize: 12, color: "var(--grey-color)" }}>Отображается на странице «Контакты» с иконкой часов.</p>
				</div>

				{/* Отображать на странице Контакты */}
				<div className="formField">
					<label style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<input
							type="checkbox"
							checked={formData.showOnContactsPage}
							onChange={(e) => setFormData({ ...formData, showOnContactsPage: e.target.checked })}
						/>
						Отображать на странице «Контакты» и на карте
					</label>
					<p style={{ marginTop: 4, fontSize: 12, color: "var(--grey-color)" }}>Если снять галочку, адрес не будет показан на странице контактов и на карте.</p>
				</div>
			</div>

			{/* Фиксированные кнопки для изменений */}
			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText={isCreating ? "Создать адрес" : "Сохранить"} />}
		</>
	);
}
