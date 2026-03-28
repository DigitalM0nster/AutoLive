"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import styles from "../local_components/styles.module.scss";
import { HomepageContentData, FormField } from "@/app/api/homepage-content/route";
import { Plus } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import HomepageSortableField from "./local_components/HomepageSortableField";

export default function AdminHomepageContent() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [data, setData] = useState<HomepageContentData | null>(null);
	const [initialData, setInitialData] = useState<HomepageContentData | null>(null); // Исходные данные для отслеживания изменений
	const [error, setError] = useState<string | null>(null);
	/** Подсветка полей формы после отказа API: fieldId → список ключей (placeholder, type, …) */
	const [fieldSaveIssues, setFieldSaveIssues] = useState<Record<string, string[]>>({});
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

		const hasDataChanges =
			data.firstBlockTitle !== initialData.firstBlockTitle ||
			data.secondBlockTitle !== initialData.secondBlockTitle ||
			data.callButtonText !== initialData.callButtonText ||
			data.orderButtonText !== initialData.orderButtonText ||
			data.formSubmitButtonText !== initialData.formSubmitButtonText ||
			JSON.stringify(data.formFields) !== JSON.stringify(initialData.formFields);

		setHasChanges(hasDataChanges);
	}, [data, initialData]);

	// Восстанавливаем позицию скролла после перетаскивания полей
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
			setFieldSaveIssues({});
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
				const errorData = (await response.json()) as {
					error?: string;
					fieldId?: string | null;
					issues?: string[];
				};
				if (errorData.fieldId && errorData.issues && errorData.issues.length > 0) {
					setFieldSaveIssues({ [errorData.fieldId]: errorData.issues });
					requestAnimationFrame(() => {
						const el = document.querySelector(`[data-homepage-field-id="${CSS.escape(String(errorData.fieldId))}"]`);
						el?.scrollIntoView({ behavior: "smooth", block: "center" });
					});
				} else {
					setFieldSaveIssues({});
				}
				throw new Error(errorData.error || "Ошибка сохранения");
			}

			const savedData = await response.json();
			const normalizedSavedData = JSON.parse(JSON.stringify(savedData)) as HomepageContentData;
			setData(normalizedSavedData);
			setInitialData(normalizedSavedData);
			setHasChanges(false);
			setFieldSaveIssues({});

			alert("Данные успешно сохранены!");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (!initialData) return;
		setData(JSON.parse(JSON.stringify(initialData)));
		setHasChanges(false);
		setFieldSaveIssues({});
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

		setFieldSaveIssues((prev) => {
			if (!prev[fieldId]) return prev;
			const next = { ...prev };
			delete next[fieldId];
			return next;
		});

		setData({
			...data,
			formFields: data.formFields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
		});
	};

	const handleDragEnd = (event: DragEndEvent) => {
		if (!data) return;

		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}

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

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	if (loading) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer column">
						<Link href="/admin/content" className={styles.backToContentLink}>
							<span className={styles.backToContentLinkArrow} aria-hidden>
								←
							</span>
							Редактор контента
						</Link>
						<div className="tabTitle">Главная страница</div>
					</div>
					<div className="tableContent">
						<div className={styles.editorPlaceholder}>Загрузка...</div>
					</div>
				</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer column">
						<Link href="/admin/content" className={styles.backToContentLink}>
							<span className={styles.backToContentLinkArrow} aria-hidden>
								←
							</span>
							Редактор контента
						</Link>
						<div className="tabTitle">Главная страница</div>
					</div>
					<div className="tableContent">
						<div className={styles.editorPlaceholder}>Ошибка загрузки данных</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer column">
					<Link href="/admin/content" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						Редактор контента
					</Link>
					<div className="tabTitle">Главная страница</div>
				</div>
				<div className={`tableContent contentComponent ${styles.contentComponent}`}>
					<div className={`formFields ${styles.formFields}`}>
						{error && <div className={styles.errorBlock}>{error}</div>}

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Блоки главной страницы</h3>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="firstBlockTitle">Заголовок первого блока (видео, менеджер) *</label>
								<input
									type="text"
									id="firstBlockTitle"
									value={data.firstBlockTitle}
									onChange={(e) => setData({ ...data, firstBlockTitle: e.target.value })}
									placeholder="Выбрать запчасти с менеджером:"
								/>
							</div>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="secondBlockTitle">Заголовок второго блока (карточки разделов) *</label>
								<input
									type="text"
									id="secondBlockTitle"
									value={data.secondBlockTitle}
									onChange={(e) => setData({ ...data, secondBlockTitle: e.target.value })}
									placeholder="Выбрать запчасти самостоятельно:"
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
										Текст кнопки &quot;Оставить заявку&quot; *<span className={styles.labelHint}>(кнопка для открытия формы заказа)</span>
									</label>
									<input
										type="text"
										id="orderButtonText"
										value={data.orderButtonText}
										onChange={(e) => setData({ ...data, orderButtonText: e.target.value })}
										placeholder="Оставить заявку"
									/>
								</div>
							</div>
						</div>

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Форма обратной связи</h3>

							<div className={`formField ${styles.formField}`}>
								<label htmlFor="formSubmitButtonText">Текст кнопки отправки формы *</label>
								<input
									type="text"
									id="formSubmitButtonText"
									value={data.formSubmitButtonText}
									onChange={(e) => setData({ ...data, formSubmitButtonText: e.target.value })}
									placeholder="Оставить заявку"
								/>
							</div>

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
											<HomepageSortableField
												key={field.id}
												field={field}
												index={index}
												onRemove={removeFormField}
												onUpdate={updateFormField}
												validationIssues={fieldSaveIssues[field.id]}
											/>
										))}

										{data.formFields.length === 0 && (
											<div className={`${styles.editorPlaceholder} ${styles.centeredPlaceholder}`}>
												Нет полей формы. Нажмите &quot;Добавить поле&quot; для создания первого поля.
											</div>
										)}
									</div>
								</SortableContext>
							</DndContext>

							<button type="button" onClick={addFormField} className={`button ${styles.addFieldButton}`}>
								<Plus size={16} />
								Добавить поле
							</button>
						</div>
					</div>
				</div>
			</div>

			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText="Сохранить изменения" />}
		</div>
	);
}
