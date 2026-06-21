"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import styles from "./OrderPopup.module.scss";
import { useUiStore } from "@/store/uiStore";
import { HomepageContentData, FormField, CustomFieldSubType } from "@/app/api/homepage-content/route";
import PersonalDataConsent from "@/components/user/personalDataConsent/PersonalDataConsent";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";
import {
	canSubmitHomepageRequest,
	formFieldsToPartDefs,
	getHomepageRequestMissingFields,
	validateHomepageRequestValues,
} from "@/lib/homepageRequestFormShared";
import { showSuccessToast } from "@/components/ui/toast/ToastProvider";
import { getOrderPopupHeading } from "@/lib/siteRequestSource";

export default function OrderPopup() {
	const { isActiveOrderPopup, deactivateOrderPopup, homepageFormData, orderPopupSource } = useUiStore();
	const [formValues, setFormValues] = useState<Record<string, string | File>>({});
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [personalDataConsent, setPersonalDataConsent] = useState(false);
	const [consentShowError, setConsentShowError] = useState(false);
	const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

	useEffect(() => {
		if (isActiveOrderPopup && !homepageFormData) {
			loadFormData();
		}
	}, [isActiveOrderPopup, homepageFormData]);

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

	const clearFieldError = (key: string) => {
		setFieldErrors((prev) => {
			if (!prev[key]) return prev;
			const next = { ...prev };
			delete next[key];
			return next;
		});
	};

	const handleTextareaInput = (fieldId: string, e: React.FormEvent<HTMLTextAreaElement>) => {
		const value = e.currentTarget.value;
		setFormValues((prev) => ({ ...prev, [fieldId]: value }));
		clearFieldError(fieldId);

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
			setFormValues((prev) => {
				const next = { ...prev };
				if (file) next[fieldId] = file;
				else delete next[fieldId];
				return next;
			});
		} else {
			setFormValues((prev) => ({ ...prev, [fieldId]: e.target.value }));
		}
		clearFieldError(fieldId);
	};

	const handleSubmit = async () => {
		if (!homepageFormData) return;

		const getValue = (key: string) => formValues[key] ?? null;
		if (!canSubmitHomepageRequest(homepageFormData.formFields, getValue, { personalDataConsent })) {
			return;
		}

		setFieldErrors({});

		if (!personalDataConsent) {
			setConsentShowError(true);
			return;
		}
		setConsentShowError(false);

		const check = validateHomepageRequestValues(homepageFormData.formFields, getValue);
		if (!check.ok) {
			setFieldErrors({ [check.fieldKey]: check.message });
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

			const source = orderPopupSource;
			fd.append("source_type", source?.type ?? "homepage");
			if (source?.label) fd.append("source_label", source.label);
			if (source?.promotionId) fd.append("promotion_id", String(source.promotionId));

			const res = await fetch("/api/homepage-requests", { method: "POST", body: fd });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				setFieldErrors({ _form: typeof data.error === "string" ? data.error : "Ошибка отправки заявки. Попробуйте позже." });
				return;
			}
			showSuccessToast("Заявка отправлена! Мы свяжемся с вами по телефону.");
			setFormValues({});
			deactivateOrderPopup();
		} catch {
			setFieldErrors({ _form: "Ошибка отправки заявки. Попробуйте позже." });
		} finally {
			setSubmitting(false);
		}
	};

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
		serviceBlockTitle: "Запись на ТО",
		serviceBlockSubtitle: "Выберите удобное время и запишитесь на техническое обслуживание в нашем сервисе",
		serviceBlockCtaText: "Записаться на обслуживание",
		serviceBlockImageUrl: null,
	};

	const getValue = (key: string) => formValues[key] ?? null;

	const canSubmit = useMemo(
		() => canSubmitHomepageRequest(formData.formFields, getValue, { personalDataConsent }),
		[formData.formFields, formValues, personalDataConsent],
	);

	const missingFields = useMemo(
		() => getHomepageRequestMissingFields(formData.formFields, getValue, { personalDataConsent }),
		[formData.formFields, formValues, personalDataConsent],
	);

	const showSubmitHint = !submitting && !canSubmit && missingFields.length > 0;

	const renderFieldError = (key: string) => (fieldErrors[key] ? <p className={styles.fieldError}>{fieldErrors[key]}</p> : null);

	const renderFileField = (fieldKey: string, hint?: string) => {
		const file = formValues[fieldKey];
		const fileName = file instanceof File ? file.name : null;

		return (
			<div className={styles.fileField}>
				{hint ? <p className={styles.fileHint}>{hint}</p> : null}
				<input
					type="file"
					accept="image/*"
					className={styles.fileInput}
					onChange={(e) => handleInputChange(fieldKey, e)}
				/>
				{fileName ? <p className={styles.fileName}>{fileName}</p> : null}
			</div>
		);
	};

	const renderVinOrPhotoField = (field: FormField, fieldId: string, hasError: boolean) => {
		const textKey = `${fieldId}_1`;
		const fileKey = `${fieldId}_2`;
		const textValue = typeof formValues[textKey] === "string" ? formValues[textKey] : "";
		const file = formValues[fileKey];
		const fileName = file instanceof File ? file.name : null;
		const hasValue = textValue.trim().length > 0 || Boolean(fileName);
		const sep = (field.separatorText || "или").trim();
		const fileInputId = `${fieldId}-file`;

		const clearFile = () => {
			setFormValues((prev) => {
				const next = { ...prev };
				delete next[fileKey];
				return next;
			});
			clearFieldError(fieldId);
		};

		return (
			<div
				className={[styles.vinField, hasValue ? styles.hasValue : "", hasError ? styles.hasError : ""].filter(Boolean).join(" ")}
			>
				<div className={styles.vinFieldBody}>
					<input
						type="text"
						className={styles.vinFieldInput}
						placeholder={field.firstFieldPlaceholder || field.placeholder?.trim() || "VIN-код"}
						value={textValue}
						onChange={(e) => handleInputChange(textKey, e)}
						aria-label={field.placeholder?.trim() || "VIN-код"}
					/>

					{sep ? (
						<div className={styles.vinFieldDivider} aria-hidden="true">
							<span>{sep}</span>
						</div>
					) : null}

					<div className={styles.vinFieldUpload}>
						<input
							type="file"
							id={fileInputId}
							accept="image/*"
							className={styles.vinFieldFileInput}
							onChange={(e) => handleInputChange(fileKey, e)}
						/>
						<label
							htmlFor={fileInputId}
							className={[styles.vinFieldUploadButton, fileName ? styles.hasFile : ""].filter(Boolean).join(" ")}
						>
							<span className={styles.vinFieldUploadIcon} aria-hidden="true" />
							<span className={styles.vinFieldUploadText}>
								{fileName ? fileName : field.secondFieldPlaceholder || "Фото"}
							</span>
						</label>
						{fileName ? (
							<button type="button" className={styles.vinFieldClearFile} onClick={clearFile} aria-label="Удалить фото">
								×
							</button>
						) : null}
					</div>
				</div>
			</div>
		);
	};

	const renderCustomSubField = (subFieldType: CustomFieldSubType, placeholder: string, fieldId: string, subFieldIndex: number) => {
		const subFieldId = `${fieldId}_${subFieldIndex}`;
		const value = formValues[subFieldId] || "";

		if (subFieldType === "file") {
			return <div key={subFieldId}>{renderFileField(subFieldId, "Фотография VIN-кода")}</div>;
		}

		if (subFieldType === "phone") {
			return (
				<PhoneInput
					key={subFieldId}
					value={typeof value === "string" ? value : ""}
					onValueChange={(raw) => {
						setFormValues((prev) => ({ ...prev, [subFieldId]: raw }));
						clearFieldError(subFieldId);
					}}
					placeholder={placeholder}
					inputClassName={styles.fieldInput}
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
				type="text"
				className={styles.fieldInput}
				placeholder={placeholder}
				value={typeof value === "string" ? value : ""}
				onChange={(e) => handleInputChange(subFieldId, e)}
			/>
		);
	};

	const renderFormField = (field: FormField) => {
		const fieldId = `field-${field.id}`;
		const value = formValues[field.id] || "";
		const errorKey = field.type === "custom" ? fieldId : field.id;
		const hasError = Boolean(fieldErrors[errorKey] || fieldErrors[field.id]);

		if (field.type === "custom") {
			const isVinOrPhoto =
				(field.firstFieldType || "text") !== "file" && (field.secondFieldType || "file") === "file";

			return (
				<div key={field.id} className={[styles.fieldWrap, hasError ? styles.hasError : ""].filter(Boolean).join(" ")}>
					{isVinOrPhoto ? (
						renderVinOrPhotoField(field, fieldId, hasError)
					) : (
						<div className={styles.inputGroup}>
							{renderCustomSubField(field.firstFieldType || "text", field.firstFieldPlaceholder || "", fieldId, 1)}
							{(field.separatorText || "").trim() ? (
								<div className={styles.orText}>{(field.separatorText || "").trim()}</div>
							) : null}
							{renderCustomSubField(field.secondFieldType || "file", field.secondFieldPlaceholder || "", fieldId, 2)}
						</div>
					)}
					{renderFieldError(errorKey)}
				</div>
			);
		}

		const wrap = (content: React.ReactNode) => (
			<div key={field.id} className={[styles.fieldWrap, hasError ? styles.hasError : ""].filter(Boolean).join(" ")}>
				{content}
				{renderFieldError(field.id)}
			</div>
		);

		if (field.type === "textarea") {
			return wrap(
				<textarea
					ref={(el) => {
						textareaRefs.current[field.id] = el;
					}}
					value={typeof value === "string" ? value : ""}
					onInput={(e) => handleTextareaInput(field.id, e)}
					placeholder={field.placeholder}
					className={styles.autoExpandTextarea}
				/>,
			);
		}

		if (field.type === "file") {
			const hint = /vin|вин/i.test(field.placeholder || "") ? "Фотография VIN-кода" : undefined;
			return wrap(renderFileField(field.id, hint));
		}

		if (field.type === "phone") {
			return wrap(
				<PhoneInput
					value={typeof value === "string" ? value : ""}
					onValueChange={(raw) => {
						setFormValues((prev) => ({ ...prev, [field.id]: raw }));
						clearFieldError(field.id);
					}}
					placeholder={field.placeholder}
					inputClassName={styles.fieldInput}
				/>,
			);
		}

		return wrap(
			<input
				type="text"
				className={styles.fieldInput}
				placeholder={field.placeholder}
				value={typeof value === "string" ? value : ""}
				onChange={(e) => handleInputChange(field.id, e)}
			/>,
		);
	};

	return (
		<>
			<div
				className={[styles.overlay, isActiveOrderPopup ? styles.active : ""].filter(Boolean).join(" ")}
				onClick={deactivateOrderPopup}
				aria-hidden="true"
			/>
			<div
				className={[styles.panel, isActiveOrderPopup ? styles.active : ""].filter(Boolean).join(" ")}
				role="dialog"
				aria-modal="true"
				aria-labelledby="order-popup-title"
			>
				<div className={styles.headerBlock}>
					<button type="button" className={styles.closeButton} onClick={deactivateOrderPopup} aria-label="Закрыть">
						<span className={styles.closeLine} aria-hidden="true" />
						<span className={styles.closeLine} aria-hidden="true" />
					</button>
					<div className={styles.header}>
						<p className={styles.eyebrow}>Онлайн-форма</p>
						<h2 id="order-popup-title" className={styles.title}>
							{getOrderPopupHeading(formData.orderButtonText)}
						</h2>
					</div>
				</div>

				<div className={styles.panelBody}>
					<div className={styles.form}>
						{formData.formFields.map((field) => renderFormField(field))}
					</div>

					<div className={styles.footer}>
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

						{fieldErrors._form ? <div className={styles.formError}>{fieldErrors._form}</div> : null}

						<div className={[styles.submitWrap, showSubmitHint ? styles.submitWrapBlocked : ""].filter(Boolean).join(" ")}>
							<button
								type="button"
								className={[styles.submitButton, submitting ? styles.submitWaiting : "", !canSubmit ? styles.submitDisabled : ""]
									.filter(Boolean)
									.join(" ")}
								onClick={() => void handleSubmit()}
								disabled={submitting || !canSubmit}
								aria-describedby={showSubmitHint ? "order-popup-submit-hint" : undefined}
							>
								{submitting ? "Отправка…" : formData.formSubmitButtonText}
							</button>

							{showSubmitHint ? (
								<div className={styles.submitHint} id="order-popup-submit-hint" role="tooltip">
									<p className={styles.submitHintTitle}>Чтобы отправить заявку, укажите:</p>
									<ul className={styles.submitHintList}>
										{missingFields.map((item) => (
											<li key={item}>{item}</li>
										))}
									</ul>
								</div>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
