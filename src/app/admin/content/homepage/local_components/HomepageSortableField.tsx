"use client";

import React from "react";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "../../local_components/styles.module.scss";
import { FormField, FormFieldType, CustomFieldSubType } from "@/app/api/homepage-content/route";

type Props = {
	field: FormField;
	index: number;
	onRemove: (fieldId: string) => void;
	onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
	/** Ключи из ответа API сохранения — подсветка конкретных инпутов */
	validationIssues?: string[];
};

/** Вынесен из страницы, чтобы тип компонента не менялся при каждом ререндере — иначе теряется фокус и скролл «прыгает». */
export default function HomepageSortableField({ field, index, onRemove, onUpdate, validationIssues }: Props) {
	const iss = (key: string) => Boolean(validationIssues?.includes(key));
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
		opacity: isDragging ? 0.6 : 1,
		...(isDragging && originalHeightRef.current ? { height: `${originalHeightRef.current}px` } : {}),
	};

	return (
		<div
			data-homepage-field-id={field.id}
			ref={(node) => {
				setNodeRef(node);
				if (node) {
					(elementRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
				}
			}}
			style={dragStyle}
			className={`borderBlock ${styles.sortableFieldContainer} ${isDragging ? styles.isDragging : ""}${
				iss("id") ? ` ${styles.fieldValidationCard}` : ""
			}`}
		>
			<div className={styles.fieldHeader}>
				<div {...attributes} {...listeners} className="dragHandle" title="Перетащить для изменения порядка">
					<GripVertical size={16} />
				</div>
				Поле {index + 1}
			</div>
			<button type="button" onClick={() => onRemove(field.id)} className="deleteButton">
				× Удалить поле
			</button>

			<div className="formRow">
				<div className={`formField ${styles.formField}`}>
					<label className={styles.checkboxLabel}>
						<input
							type="checkbox"
							checked={field.required}
							onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
							className={styles.checkboxInput}
						/>
						Обязательное поле
					</label>
				</div>
			</div>
			<div className="formRow">
				<div className={`formField ${styles.formField}`}>
					<label htmlFor={`field-type-${field.id}`}>Тип поля *</label>
					<select
						id={`field-type-${field.id}`}
						value={field.type}
						className={iss("type") ? "error" : ""}
						onChange={(e) => {
							const newType = e.target.value as FormFieldType;
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
								updates.separatorText = field.separatorText ?? "";
							}
							onUpdate(field.id, updates);
						}}
					>
						<option value="text">Текст</option>
						<option value="phone">Телефон</option>
						<option value="textarea">Многострочный текст</option>
						<option value="file">Файл</option>
						<option value="custom">Настраиваемое (два поля на выбор)</option>
					</select>
				</div>

				<div className={`formField ${styles.formField}`}>
					<label htmlFor={`field-placeholder-${field.id}`}>НАЗВАНИЕ *</label>
					<input
						type="text"
						id={`field-placeholder-${field.id}`}
						value={field.placeholder}
						onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
						placeholder="Например: Наименование детали"
						className={iss("placeholder") ? "error" : ""}
					/>
				</div>
			</div>

			{field.type === "custom" && (
				<div className="formRow">
					<div className={`borderBlock ${styles.fieldItem}`}>
						<div className={styles.fieldItemTitle}>Первое поле</div>
						<div className={`formField ${styles.formField}`}>
							<label htmlFor={`field-firstFieldType-${field.id}`}>Тип первого поля *</label>
							<select
								id={`field-firstFieldType-${field.id}`}
								value={field.firstFieldType || "text"}
								className={iss("firstFieldType") ? "error" : ""}
								onChange={(e) => onUpdate(field.id, { firstFieldType: e.target.value as CustomFieldSubType })}
							>
								<option value="text">Текст</option>
								<option value="phone">Телефон</option>
								<option value="textarea">Многострочный текст</option>
								<option value="file">Файл</option>
							</select>
						</div>

						<div className={`formField ${styles.formField}`}>
							<label htmlFor={`field-firstFieldPlaceholder-${field.id}`}>НАЗВАНИЕ первого поля *</label>
							<input
								type="text"
								id={`field-firstFieldPlaceholder-${field.id}`}
								value={field.firstFieldPlaceholder || ""}
								onChange={(e) => onUpdate(field.id, { firstFieldPlaceholder: e.target.value })}
								placeholder="Например: Vin код"
								className={iss("firstFieldPlaceholder") ? "error" : ""}
							/>
						</div>
					</div>

					<div className={`borderBlock ${styles.fieldItem}`}>
						<div className={styles.fieldItemTitle}>Второе поле</div>
						<div className={`formField ${styles.formField}`}>
							<label htmlFor={`field-secondFieldType-${field.id}`}>Тип второго поля *</label>
							<select
								id={`field-secondFieldType-${field.id}`}
								value={field.secondFieldType || "file"}
								className={iss("secondFieldType") ? "error" : ""}
								onChange={(e) => onUpdate(field.id, { secondFieldType: e.target.value as CustomFieldSubType })}
							>
								<option value="text">Текст</option>
								<option value="phone">Телефон</option>
								<option value="textarea">Многострочный текст</option>
								<option value="file">Файл</option>
							</select>
						</div>

						<div className={`formField ${styles.formField}`}>
							<label htmlFor={`field-secondFieldPlaceholder-${field.id}`}>НАЗВАНИЕ второго поля *</label>
							<input
								type="text"
								id={`field-secondFieldPlaceholder-${field.id}`}
								value={field.secondFieldPlaceholder || ""}
								onChange={(e) => onUpdate(field.id, { secondFieldPlaceholder: e.target.value })}
								placeholder="Например: Приложите фото"
								className={iss("secondFieldPlaceholder") ? "error" : ""}
							/>
						</div>
					</div>

					<div className={`formField ${styles.formField}`}>
						<label htmlFor={`field-separatorText-${field.id}`}>Текст между полями</label>
						<input
							type="text"
							id={`field-separatorText-${field.id}`}
							value={field.separatorText || ""}
							onChange={(e) => onUpdate(field.id, { separatorText: e.target.value })}
							placeholder="Необязательно: например «или», «и»"
						/>
					</div>
				</div>
			)}
		</div>
	);
}
