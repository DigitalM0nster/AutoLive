"use client";

import { useState, useRef, useEffect } from "react";
import styles from "@/components/user/loginPopup/styles.module.scss";
import { useUiStore } from "@/store/uiStore";
import { HomepageContentData, FormField, CustomFieldSubType } from "@/app/api/homepage-content/route";

export default function OrderPopup() {
	const { isActiveOrderPopup, deactivateOrderPopup, homepageFormData } = useUiStore();
	const [formValues, setFormValues] = useState<Record<string, string | File>>({});
	const [submitting, setSubmitting] = useState(false);
	const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

	// Загружаем данные формы при открытии попапа, если их нет в store
	useEffect(() => {
		if (isActiveOrderPopup && !homepageFormData) {
			loadFormData();
		}
	}, [isActiveOrderPopup]);

	const loadFormData = async () => {
		try {
			const response = await fetch("/api/homepage-content");
			if (response.ok) {
				const data = await response.json();
				useUiStore.setState({ homepageFormData: data });
			}
		} catch (error) {
			console.error("Ошибка загрузки данных формы:", error);
		}
	};

	// Функция для автоувеличения высоты textarea
	const handleTextareaInput = (fieldId: string, e: React.FormEvent<HTMLTextAreaElement>) => {
		const value = e.currentTarget.value;
		setFormValues((prev) => ({ ...prev, [fieldId]: value }));

		const textarea = textareaRefs.current[fieldId];
		if (textarea) {
			textarea.style.height = "auto";
			requestAnimationFrame(() => {
				textarea.style.height = `${textarea.scrollHeight}px`;
			});
		}
	};

	const handleInputChange = (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.type === "file") {
			const file = e.target.files?.[0];
			if (file) {
				setFormValues((prev) => ({ ...prev, [fieldId]: file }));
			}
		} else {
			setFormValues((prev) => ({ ...prev, [fieldId]: e.target.value }));
		}
	};

	const handleSubmit = async () => {
		if (!homepageFormData) return;

		// Валидация обязательных полей
		for (const field of homepageFormData.formFields) {
			if (field.required) {
				if (field.type === "custom") {
					// Для кастомного поля проверяем, что заполнено хотя бы одно из двух подполей
					const firstValue = formValues[`field-${field.id}_1`];
					const secondValue = formValues[`field-${field.id}_2`];
					if (!firstValue && !secondValue) {
						alert(`Поле "${field.placeholder}" обязательно для заполнения (заполните хотя бы одно из двух полей)`);
						return;
					}
				} else {
					if (!formValues[field.id]) {
						alert(`Поле "${field.placeholder}" обязательно для заполнения`);
						return;
					}
				}
			}
		}

		setSubmitting(true);
		try {
			// TODO: Реализовать отправку данных формы на сервер
			// Пока просто показываем сообщение об успехе
			alert("Заявка отправлена! Мы свяжемся с вами по телефону.");
			setFormValues({});
			deactivateOrderPopup();
		} catch (error) {
			alert("Ошибка отправки заявки. Попробуйте позже.");
		} finally {
			setSubmitting(false);
		}
	};

	// Используем данные из store или дефолтные значения
	const formData: HomepageContentData = homepageFormData || {
		firstBlockTitle: "Выбрать запчасти с менеджером:",
		callButtonText: "Позвонить в магазин",
		orderButtonText: "Оставить заказ",
		formFields: [
			{
				id: "1",
				type: "custom",
				placeholder: "Vin код или фото",
				required: false,
				firstFieldType: "text",
				firstFieldPlaceholder: "Vin код",
				secondFieldType: "file",
				secondFieldPlaceholder: "Приложите фото",
				separatorText: "или",
			},
			{
				id: "2",
				type: "text",
				placeholder: "Наименование детали",
				required: true,
			},
			{
				id: "3",
				type: "phone",
				placeholder: "Телефон для связи",
				required: true,
			},
			{
				id: "4",
				type: "textarea",
				placeholder: "Комментарий (не обязательно)",
				required: false,
			},
		],
		formSubmitButtonText: "Оставить заказ",
	};

	// Рендер подполя для кастомного типа
	const renderCustomSubField = (subFieldType: CustomFieldSubType, placeholder: string, fieldId: string, subFieldIndex: number) => {
		const subFieldId = `${fieldId}_${subFieldIndex}`;
		const value = formValues[subFieldId] || "";

		if (subFieldType === "file") {
			return (
				<input
					key={subFieldId}
					type="file"
					accept="image/*"
					onChange={(e) => handleInputChange(subFieldId, e)}
					placeholder={placeholder}
				/>
			);
		}

		if (subFieldType === "textarea") {
			return (
				<textarea
					key={subFieldId}
					ref={(el) => {
						textareaRefs.current[subFieldId] = el;
					}}
					value={typeof value === "string" ? value : ""}
					onInput={(e) => handleTextareaInput(subFieldId, e)}
					placeholder={placeholder}
					className={styles.autoExpandTextarea}
				/>
			);
		}

		return (
			<input
				key={subFieldId}
				type={subFieldType === "phone" ? "tel" : "text"}
				placeholder={placeholder}
				value={typeof value === "string" ? value : ""}
				onChange={(e) => handleInputChange(subFieldId, e)}
			/>
		);
	};

	const renderFormField = (field: FormField) => {
		const fieldId = `field-${field.id}`;
		const value = formValues[field.id] || "";

		if (field.type === "custom") {
			// Кастомное поле - два поля с выбором типов
			return (
				<div key={field.id} className={styles.inputGroup}>
					{renderCustomSubField(
						field.firstFieldType || "text",
						field.firstFieldPlaceholder || "",
						fieldId,
						1
					)}
					<div className="orText">{field.separatorText || "или"}</div>
					{renderCustomSubField(
						field.secondFieldType || "file",
						field.secondFieldPlaceholder || "",
						fieldId,
						2
					)}
				</div>
			);
		}

		if (field.type === "textarea") {
			return (
				<textarea
					key={field.id}
					ref={(el) => {
						textareaRefs.current[field.id] = el;
					}}
					value={typeof value === "string" ? value : ""}
					onInput={(e) => handleTextareaInput(field.id, e)}
					placeholder={field.placeholder}
					className={styles.autoExpandTextarea}
					required={field.required}
				/>
			);
		}

		if (field.type === "file") {
			return (
				<input
					key={field.id}
					type="file"
					accept="image/*"
					onChange={(e) => handleInputChange(field.id, e)}
					required={field.required}
				/>
			);
		}

		return (
			<input
				key={field.id}
				type={field.type === "phone" ? "tel" : "text"}
				placeholder={field.placeholder}
				value={typeof value === "string" ? value : ""}
				onChange={(e) => handleInputChange(field.id, e)}
				required={field.required}
			/>
		);
	};

	return (
		<>
			<div className={`${styles.background} ${isActiveOrderPopup ? styles.active : ""}`} onClick={deactivateOrderPopup} />
			<div className={`${styles.orderPopup} ${styles.popup} ${isActiveOrderPopup ? styles.active : ""}`}>
				<div className={styles.inputsBlock}>
					{formData.formFields.map((field) => renderFormField(field))}
					<div className={`button ${styles.button}`} onClick={handleSubmit} style={{ cursor: submitting ? "wait" : "pointer" }}>
						{submitting ? "Отправка..." : formData.formSubmitButtonText}
					</div>
				</div>
				<div className={styles.closeIcon} onClick={deactivateOrderPopup}>
					<div className={styles.line} />
					<div className={styles.line} />
				</div>
			</div>
		</>
	);
}
