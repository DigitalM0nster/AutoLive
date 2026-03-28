"use client";

import { useState, useRef, useEffect } from "react";
import styles from "@/components/user/loginPopup/styles.module.scss";
import { useUiStore } from "@/store/uiStore";
import { HomepageContentData, FormField, CustomFieldSubType } from "@/app/api/homepage-content/route";
import PersonalDataConsent from "@/components/user/personalDataConsent/PersonalDataConsent";
import { formFieldsToPartDefs, validateHomepageRequestValues } from "@/lib/homepageRequestFormShared";

export default function OrderPopup() {
	const { isActiveOrderPopup, deactivateOrderPopup, homepageFormData } = useUiStore();
	const [formValues, setFormValues] = useState<Record<string, string | File>>({});
	const [submitting, setSubmitting] = useState(false);
	const [personalDataConsent, setPersonalDataConsent] = useState(false);
	const [consentShowError, setConsentShowError] = useState(false);
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

		if (!personalDataConsent) {
			setConsentShowError(true);
			alert("Отметьте согласие на обработку персональных данных.");
			return;
		}
		setConsentShowError(false);

		const getValue = (key: string) => formValues[key] ?? null;
		const check = validateHomepageRequestValues(homepageFormData.formFields, getValue);
		if (!check.ok) {
			alert(check.message);
			return;
		}

		setSubmitting(true);
		try {
			const fd = new FormData();
			fd.append("personal_data_consent", "true");
			const defs = formFieldsToPartDefs(homepageFormData.formFields);
			for (const d of defs) {
				const v = formValues[d.key];
				if (d.partType === "file") {
					if (v instanceof File) fd.append(d.key, v);
				} else {
					fd.append(d.key, typeof v === "string" ? v : "");
				}
			}

			const res = await fetch("/api/homepage-requests", { method: "POST", body: fd });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				alert(typeof data.error === "string" ? data.error : "Ошибка отправки заявки. Попробуйте позже.");
				return;
			}
			alert("Заявка отправлена! Мы свяжемся с вами по телефону.");
			setFormValues({});
			deactivateOrderPopup();
		} catch {
			alert("Ошибка отправки заявки. Попробуйте позже.");
		} finally {
			setSubmitting(false);
		}
	};

	// Используем данные из store или дефолтные значения
	const formData: HomepageContentData = homepageFormData || {
		firstBlockTitle: "Выбрать запчасти с менеджером:",
		secondBlockTitle: "Выбрать запчасти самостоятельно:",
		callButtonText: "Позвонить в магазин",
		orderButtonText: "Оставить заявку",
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
			return <input key={subFieldId} type="file" accept="image/*" onChange={(e) => handleInputChange(subFieldId, e)} placeholder={placeholder} />;
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
			const sep = (field.separatorText || "").trim();
			return (
				<div key={field.id} className={styles.inputGroup}>
					{renderCustomSubField(field.firstFieldType || "text", field.firstFieldPlaceholder || "", fieldId, 1)}
					{sep ? <div className="orText">{sep}</div> : null}
					{renderCustomSubField(field.secondFieldType || "file", field.secondFieldPlaceholder || "", fieldId, 2)}
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
			return <input key={field.id} type="file" accept="image/*" onChange={(e) => handleInputChange(field.id, e)} required={field.required} />;
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
					<PersonalDataConsent
						id="order-popup-pd-consent"
						wrapperClassName={styles.consentBlock}
						checked={personalDataConsent}
						onChange={(v) => {
							setPersonalDataConsent(v);
							if (v) setConsentShowError(false);
						}}
						showError={consentShowError}
					/>
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
