"use client";

import React from "react";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CustomFieldSubType, FormField, FormFieldType } from "@/app/api/homepage-content/route";
import styles from "../SiteFeedbackFormEditor.module.scss";

type FeedbackFormFieldCardProps = {
	field: FormField;
	index: number;
	onRemove: (fieldId: string) => void;
	onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
	validationIssues?: string[];
};

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
	text: "Текст",
	phone: "Телефон",
	textarea: "Длинный текст",
	file: "Файл",
	custom: "Два поля",
};

function fieldDisplayTitle(field: FormField): string {
	if (field.type === "custom") {
		const first = field.firstFieldPlaceholder?.trim();
		const second = field.secondFieldPlaceholder?.trim();
		if (first && second) return `${first} / ${second}`;
		if (first || second) return first || second || "Без названия";
	}
	return field.placeholder?.trim() || "Без названия";
}

export default function FeedbackFormFieldCard({ field, index, onRemove, onUpdate, validationIssues }: FeedbackFormFieldCardProps) {
	const hasIssue = (key: string) => Boolean(validationIssues?.includes(key));
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
	const elementRef = React.useRef<HTMLDivElement>(null);
	const originalHeightRef = React.useRef<number | null>(null);

	React.useEffect(() => {
		if (isDragging && elementRef.current && !originalHeightRef.current) {
			originalHeightRef.current = elementRef.current.offsetHeight;
		} else if (!isDragging) {
			originalHeightRef.current = null;
		}
	}, [isDragging]);

	const dragStyle: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.85 : 1,
		...(isDragging && originalHeightRef.current ? { height: `${originalHeightRef.current}px` } : {}),
	};

	const displayTitle = fieldDisplayTitle(field);
	const hasTitle = field.type === "custom" ?
		Boolean(field.firstFieldPlaceholder?.trim() || field.secondFieldPlaceholder?.trim())
	:	Boolean(field.placeholder?.trim());

	const onTypeChange = (newType: FormFieldType) => {
		const updates: Partial<FormField> = { type: newType };
		if (newType !== "custom") {
			updates.firstFieldType = undefined;
			updates.firstFieldPlaceholder = undefined;
			updates.secondFieldType = undefined;
			updates.secondFieldPlaceholder = undefined;
			updates.separatorText = undefined;
		} else {
			updates.firstFieldType = field.firstFieldType || "text";
			updates.firstFieldPlaceholder = field.firstFieldPlaceholder || "";
			updates.secondFieldType = field.secondFieldType || "file";
			updates.secondFieldPlaceholder = field.secondFieldPlaceholder || "";
			updates.separatorText = field.separatorText ?? "или";
		}
		onUpdate(field.id, updates);
	};

	return (
		<div
			data-homepage-field-id={field.id}
			ref={(node) => {
				setNodeRef(node);
				if (node) elementRef.current = node;
			}}
			style={dragStyle}
			className={[
				styles.fieldCard,
				isDragging ? styles.isDragging : "",
				hasIssue("id") ? styles.hasValidationError : "",
			]
				.filter(Boolean)
				.join(" ")}
		>
			<div className={styles.fieldCardHead}>
				<button type="button" className={styles.dragHandle} title="Перетащите для изменения порядка" {...attributes} {...listeners}>
					<GripVertical size={16} aria-hidden />
				</button>

				<div className={styles.fieldCardTitleWrap}>
					<span className={[styles.fieldCardTitle, !hasTitle ? styles.isPlaceholder : ""].filter(Boolean).join(" ")}>
						{displayTitle}
					</span>
					<span className={styles.fieldCardMeta}>Поле {index + 1}</span>
				</div>

				<span className={styles.typeBadge}>{FIELD_TYPE_LABELS[field.type]}</span>

				<label className={styles.requiredToggle}>
					<input
						type="checkbox"
						checked={field.required}
						onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
					/>
					Обязательное
				</label>

				<button type="button" className={styles.removeFieldBtn} onClick={() => onRemove(field.id)}>
					Удалить
				</button>
			</div>

			<div className={styles.fieldCardBody}>
				<div className={styles.fieldRow}>
					<div className={styles.fieldGroup}>
						<label htmlFor={`field-type-${field.id}`}>Тип поля</label>
						<select
							id={`field-type-${field.id}`}
							value={field.type}
							className={hasIssue("type") ? "hasError" : ""}
							onChange={(e) => onTypeChange(e.target.value as FormFieldType)}
						>
							<option value="text">Текст — одна строка</option>
							<option value="phone">Телефон</option>
							<option value="textarea">Длинный текст</option>
							<option value="file">Загрузка файла</option>
							<option value="custom">Два поля на выбор (например: VIN или фото)</option>
						</select>
					</div>

					{field.type !== "custom" && (
						<div className={styles.fieldGroup}>
							<label htmlFor={`field-placeholder-${field.id}`}>Название поля</label>
							<input
								type="text"
								id={`field-placeholder-${field.id}`}
								value={field.placeholder}
								onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
								placeholder="Например: Наименование детали"
								className={hasIssue("placeholder") ? "hasError" : ""}
							/>
						</div>
					)}
				</div>

				{field.type === "custom" && (
					<>
						<div className={styles.fieldRow}>
							<div className={styles.customBlock}>
								<p className={styles.customBlockTitle}>Первое поле</p>
								<div className={styles.fieldGroup}>
									<label htmlFor={`field-firstFieldType-${field.id}`}>Тип</label>
									<select
										id={`field-firstFieldType-${field.id}`}
										value={field.firstFieldType || "text"}
										className={hasIssue("firstFieldType") ? "hasError" : ""}
										onChange={(e) => onUpdate(field.id, { firstFieldType: e.target.value as CustomFieldSubType })}
									>
										<option value="text">Текст</option>
										<option value="phone">Телефон</option>
										<option value="textarea">Длинный текст</option>
										<option value="file">Файл</option>
									</select>
								</div>
								<div className={styles.fieldGroup}>
									<label htmlFor={`field-firstFieldPlaceholder-${field.id}`}>Название</label>
									<input
										type="text"
										id={`field-firstFieldPlaceholder-${field.id}`}
										value={field.firstFieldPlaceholder || ""}
										onChange={(e) => onUpdate(field.id, { firstFieldPlaceholder: e.target.value })}
										placeholder="Например: VIN-код"
										className={hasIssue("firstFieldPlaceholder") ? "hasError" : ""}
									/>
								</div>
							</div>

							<div className={styles.customBlock}>
								<p className={styles.customBlockTitle}>Второе поле</p>
								<div className={styles.fieldGroup}>
									<label htmlFor={`field-secondFieldType-${field.id}`}>Тип</label>
									<select
										id={`field-secondFieldType-${field.id}`}
										value={field.secondFieldType || "file"}
										className={hasIssue("secondFieldType") ? "hasError" : ""}
										onChange={(e) => onUpdate(field.id, { secondFieldType: e.target.value as CustomFieldSubType })}
									>
										<option value="text">Текст</option>
										<option value="phone">Телефон</option>
										<option value="textarea">Длинный текст</option>
										<option value="file">Файл</option>
									</select>
								</div>
								<div className={styles.fieldGroup}>
									<label htmlFor={`field-secondFieldPlaceholder-${field.id}`}>Название</label>
									<input
										type="text"
										id={`field-secondFieldPlaceholder-${field.id}`}
										value={field.secondFieldPlaceholder || ""}
										onChange={(e) => onUpdate(field.id, { secondFieldPlaceholder: e.target.value })}
										placeholder="Например: Приложите фото"
										className={hasIssue("secondFieldPlaceholder") ? "hasError" : ""}
									/>
								</div>
							</div>
						</div>

						<div className={styles.fieldGroup}>
							<label htmlFor={`field-separatorText-${field.id}`}>Слово между полями</label>
							<input
								type="text"
								id={`field-separatorText-${field.id}`}
								value={field.separatorText || ""}
								onChange={(e) => onUpdate(field.id, { separatorText: e.target.value })}
								placeholder="или"
							/>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
