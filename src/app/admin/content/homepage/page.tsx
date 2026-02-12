"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import styles from "../local_components/styles.module.scss";
import { HomepageContentData, FormField, FormFieldType, CustomFieldSubType } from "@/app/api/homepage-content/route";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";

export default function AdminHomepageContent() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [data, setData] = useState<HomepageContentData | null>(null);
	const [initialData, setInitialData] = useState<HomepageContentData | null>(null); // Исходные данные для отслеживания изменений
	const [error, setError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false);
	const scrollPositionRef = useRef<number | null>(null);
	const shouldRestoreScrollRef = useRef<boolean>(false);

	// Загрузка данных при монтировании
	useEffect(() => {
		loadData();
	}, []);

	// Отслеживание изменений
	useEffect(() => {
		if (!data || !initialData) {
			setHasChanges(false);
			return;
		}

		// Сравниваем данные
		const hasDataChanges =
			data.firstBlockTitle !== initialData.firstBlockTitle ||
			data.callButtonText !== initialData.callButtonText ||
			data.orderButtonText !== initialData.orderButtonText ||
			data.formSubmitButtonText !== initialData.formSubmitButtonText ||
			JSON.stringify(data.formFields) !== JSON.stringify(initialData.formFields);

		setHasChanges(hasDataChanges);
	}, [data, initialData]);

	// Восстанавливаем позицию скролла после обновления DOM
	useLayoutEffect(() => {
		if (shouldRestoreScrollRef.current && scrollPositionRef.current !== null) {
			window.scrollTo({
				top: scrollPositionRef.current,
				behavior: "instant" as ScrollBehavior,
			});
			shouldRestoreScrollRef.current = false;
			scrollPositionRef.current = null;
		}
	});

	const loadData = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/homepage-content");
			if (!response.ok) {
				throw new Error("Ошибка загрузки данных");
			}
			const content = await response.json();
			setData(content);
			setInitialData(JSON.parse(JSON.stringify(content))); // Глубокая копия для сравнения
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка загрузки");
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!data) return;

		try {
			setSaving(true);
			setError(null);

			const response = await fetch("/api/homepage-content", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка сохранения");
			}

			// Обновляем исходные данные после успешного сохранения
			const savedData = await response.json();
			setInitialData(JSON.parse(JSON.stringify(savedData)));
			setHasChanges(false);

			alert("Данные успешно сохранены!");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (!initialData) return;
		// Возвращаем данные к исходным значениям
		setData(JSON.parse(JSON.stringify(initialData)));
		setHasChanges(false);
	};

	const addFormField = () => {
		if (!data) return;

		const newField: FormField = {
			id: Date.now().toString(),
			type: "text",
			placeholder: "",
			required: false,
		};

		setData({
			...data,
			formFields: [...data.formFields, newField],
		});
	};

	const removeFormField = (fieldId: string) => {
		if (!data) return;

		setData({
			...data,
			formFields: data.formFields.filter((f) => f.id !== fieldId),
		});
	};

	const updateFormField = (fieldId: string, updates: Partial<FormField>) => {
		if (!data) return;

		setData({
			...data,
			formFields: data.formFields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
		});
	};

	// Обработчик перетаскивания полей
	const handleDragEnd = (event: DragEndEvent) => {
		if (!data) return;

		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}

		// Сохраняем текущую позицию скролла перед обновлением состояния
		scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
		shouldRestoreScrollRef.current = true;

		const oldIndex = data.formFields.findIndex((f) => f.id === active.id);
		const newIndex = data.formFields.findIndex((f) => f.id === over.id);

		if (oldIndex !== -1 && newIndex !== -1) {
			const newFields = arrayMove(data.formFields, oldIndex, newIndex);
			setData({
				...data,
				formFields: newFields,
			});
		}
	};

	// Настройка сенсоров для drag and drop
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // Минимальное расстояние для начала перетаскивания
			},
		}),
	);

	// Компонент для сортируемого поля формы
	const SortableFormField = ({ field, index }: { field: FormField; index: number }) => {
		const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
		const elementRef = React.useRef<HTMLDivElement>(null);
		const originalHeightRef = React.useRef<number | null>(null);

		// Сохраняем оригинальную высоту при начале перетаскивания
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
				ref={(node) => {
					setNodeRef(node);
					if (node) {
						(elementRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
					}
				}}
				style={dragStyle}
				className={`borderBlock ${styles.sortableFieldContainer} ${isDragging ? styles.isDragging : ""}`}
			>
				<div className={styles.fieldHeader}>
					<div {...attributes} {...listeners} className="dragHandle" title="Перетащить для изменения порядка">
						<GripVertical size={16} />
					</div>
					Поле {index + 1}
				</div>
				<button type="button" onClick={() => removeFormField(field.id)} className="deleteButton">
					× Удалить поле
				</button>

				<div className="formRow">
					<div className={`formField ${styles.formField}`}>
						<label className={styles.checkboxLabel}>
							<input
								type="checkbox"
								checked={field.required}
								onChange={(e) => updateFormField(field.id, { required: e.target.checked })}
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
							onChange={(e) => {
								const newType = e.target.value as FormFieldType;
								const updates: Partial<FormField> = { type: newType };
								// Если тип не custom, удаляем специфичные поля кастомного типа
								if (newType !== "custom") {
									updates.firstFieldType = undefined;
									updates.firstFieldPlaceholder = undefined;
									updates.secondFieldType = undefined;
									updates.secondFieldPlaceholder = undefined;
									updates.separatorText = undefined;
								} else {
									// Если переключились на custom, добавляем дефолтные значения
									updates.firstFieldType = field.firstFieldType || "text";
									updates.firstFieldPlaceholder = field.firstFieldPlaceholder || "";
									updates.secondFieldType = field.secondFieldType || "file";
									updates.secondFieldPlaceholder = field.secondFieldPlaceholder || "";
									updates.separatorText = field.separatorText || "или";
								}
								updateFormField(field.id, updates);
							}}
						>
							<option value="text">Текст</option>
							<option value="phone">Телефон</option>
							<option value="textarea">Многострочный текст</option>
							<option value="file">Файл</option>
							<option value="custom">Кастомное (два поля на выбор)</option>
						</select>
					</div>

					<div className={`formField ${styles.formField}`}>
						<label htmlFor={`field-placeholder-${field.id}`}>Placeholder (описание поля) *</label>
						<input
							type="text"
							id={`field-placeholder-${field.id}`}
							value={field.placeholder}
							onChange={(e) => updateFormField(field.id, { placeholder: e.target.value })}
							placeholder="Например: Наименование детали"
						/>
					</div>
				</div>

				{/* Дополнительные поля для кастомного типа */}
				{field.type === "custom" && (
					<div className="formRow">
						<div className={`borderBlock ${styles.fieldItem}`}>
							<div className={styles.fieldItemTitle}>Первое поле</div>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor={`field-firstFieldType-${field.id}`}>Тип первого поля *</label>
								<select
									id={`field-firstFieldType-${field.id}`}
									value={field.firstFieldType || "text"}
									onChange={(e) => updateFormField(field.id, { firstFieldType: e.target.value as CustomFieldSubType })}
								>
									<option value="text">Текст</option>
									<option value="phone">Телефон</option>
									<option value="textarea">Многострочный текст</option>
									<option value="file">Файл</option>
								</select>
							</div>

							<div className={`formField ${styles.formField}`}>
								<label htmlFor={`field-firstFieldPlaceholder-${field.id}`}>Placeholder первого поля *</label>
								<input
									type="text"
									id={`field-firstFieldPlaceholder-${field.id}`}
									value={field.firstFieldPlaceholder || ""}
									onChange={(e) => updateFormField(field.id, { firstFieldPlaceholder: e.target.value })}
									placeholder="Например: Vin код"
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
									onChange={(e) => updateFormField(field.id, { secondFieldType: e.target.value as CustomFieldSubType })}
								>
									<option value="text">Текст</option>
									<option value="phone">Телефон</option>
									<option value="textarea">Многострочный текст</option>
									<option value="file">Файл</option>
								</select>
							</div>

							<div className={`formField ${styles.formField}`}>
								<label htmlFor={`field-secondFieldPlaceholder-${field.id}`}>Placeholder второго поля *</label>
								<input
									type="text"
									id={`field-secondFieldPlaceholder-${field.id}`}
									value={field.secondFieldPlaceholder || ""}
									onChange={(e) => updateFormField(field.id, { secondFieldPlaceholder: e.target.value })}
									placeholder="Например: Приложите фото"
								/>
							</div>
						</div>

						<div className={`formField ${styles.formField}`}>
							<label htmlFor={`field-separatorText-${field.id}`}>Текст между полями *</label>
							<input
								type="text"
								id={`field-separatorText-${field.id}`}
								value={field.separatorText || ""}
								onChange={(e) => updateFormField(field.id, { separatorText: e.target.value })}
								placeholder="Например: или, и"
							/>
						</div>
					</div>
				)}
			</div>
		);
	};

	if (loading) {
		return (
			<div className="screenContent">
				<div className={styles.contentEditorBlock}>
					<div className={styles.formContainer}>
						<div className="formFields">
							<div className={styles.editorPlaceholder}>Загрузка...</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="screenContent">
				<div className={styles.contentEditorBlock}>
					<div className={styles.formContainer}>
						<div className="formFields">
							<div className={styles.editorPlaceholder}>Ошибка загрузки данных</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<div className="tabTitle">Редактирование главной страницы</div>
				</div>
				<div className={`tableContent contentComponent ${styles.contentComponent}`}>
					<div className={`formFields ${styles.formFields}`}>
						{error && <div className={styles.errorBlock}>{error}</div>}

						{/* Заголовок первого блока */}
						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Первый блок (видеоблок)</h3>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="firstBlockTitle">Заголовок первого блока *</label>
								<input
									type="text"
									id="firstBlockTitle"
									value={data.firstBlockTitle}
									onChange={(e) => setData({ ...data, firstBlockTitle: e.target.value })}
									placeholder="Выбрать запчасти с менеджером:"
								/>
							</div>

							<div className="formRow">
								<div className={`formField ${styles.formField}`}>
									<label htmlFor="callButtonText">
										Текст кнопки &quot;Позвонить в магазин&quot; *<span className={styles.labelHint}>(кнопка для связи с магазином)</span>
									</label>
									<input
										type="text"
										id="callButtonText"
										value={data.callButtonText}
										onChange={(e) => setData({ ...data, callButtonText: e.target.value })}
										placeholder="Позвонить в магазин"
									/>
								</div>

								<div className={`formField ${styles.formField}`}>
									<label htmlFor="orderButtonText">
										Текст кнопки &quot;Оставить заказ&quot; *<span className={styles.labelHint}>(кнопка для открытия формы заказа)</span>
									</label>
									<input
										type="text"
										id="orderButtonText"
										value={data.orderButtonText}
										onChange={(e) => setData({ ...data, orderButtonText: e.target.value })}
										placeholder="Оставить заказ"
									/>
								</div>
							</div>
						</div>

						{/* Форма обратной связи */}
						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Форма обратной связи</h3>

							{/* Текст кнопки отправки формы */}
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="formSubmitButtonText">Текст кнопки отправки формы *</label>
								<input
									type="text"
									id="formSubmitButtonText"
									value={data.formSubmitButtonText}
									onChange={(e) => setData({ ...data, formSubmitButtonText: e.target.value })}
									placeholder="Оставить заказ"
								/>
							</div>

							{/* Список полей формы с drag and drop */}
							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								modifiers={[restrictToVerticalAxis]}
								onDragEnd={handleDragEnd}
								autoScroll={{ enabled: false }}
							>
								<SortableContext items={data.formFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
									<div className={styles.fieldsListContainer}>
										{data.formFields.map((field, index) => (
											<SortableFormField key={field.id} field={field} index={index} />
										))}

										{data.formFields.length === 0 && (
											<div className={`${styles.editorPlaceholder} ${styles.centeredPlaceholder}`}>
												Нет полей формы. Нажмите &quot;Добавить поле&quot; для создания первого поля.
											</div>
										)}
									</div>
								</SortableContext>
							</DndContext>

							{/* Кнопка добавления поля - внизу после всех полей */}
							<button type="button" onClick={addFormField} className={`button ${styles.addFieldButton}`}>
								<Plus size={16} />
								Добавить поле
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Фиксированные кнопки для сохранения/отмены */}
			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText="Сохранить изменения" />}
		</div>
	);
}
