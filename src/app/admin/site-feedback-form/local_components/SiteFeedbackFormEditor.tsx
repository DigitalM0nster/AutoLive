"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import { showSuccessToast } from "@/components/ui/toast/ToastProvider";
import type { HomepageContentData, FormField } from "@/app/api/homepage-content/route";
import FeedbackFormFieldCard from "./FeedbackFormFieldCard";
import editorStyles from "../SiteFeedbackFormEditor.module.scss";

/** Редактор полей формы «Оставить заявку» (главная, акции, попап) */
export default function SiteFeedbackFormEditor() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [content, setContent] = useState<HomepageContentData | null>(null);
	const [initialContent, setInitialContent] = useState<HomepageContentData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [fieldSaveIssues, setFieldSaveIssues] = useState<Record<string, string[]>>({});
	const [hasChanges, setHasChanges] = useState(false);
	const scrollPositionRef = useRef<number | null>(null);
	const shouldRestoreScrollRef = useRef(false);

	useEffect(() => {
		void loadData();
	}, []);

	useEffect(() => {
		if (!content || !initialContent) {
			setHasChanges(false);
			return;
		}

		const changed =
			content.formSubmitButtonText !== initialContent.formSubmitButtonText ||
			JSON.stringify(content.formFields) !== JSON.stringify(initialContent.formFields);

		setHasChanges(changed);
	}, [content, initialContent]);

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
			if (!response.ok) throw new Error("Ошибка загрузки данных");

			const data = (await response.json()) as HomepageContentData;
			setContent(data);
			setInitialContent(JSON.parse(JSON.stringify(data)));
			setFieldSaveIssues({});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка загрузки");
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!content || !initialContent) return;

		try {
			setSaving(true);
			setError(null);

			const payload: HomepageContentData = {
				...initialContent,
				formFields: content.formFields,
				formSubmitButtonText: content.formSubmitButtonText,
			};

			const response = await fetch("/api/homepage-content", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(payload),
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

			const savedData = (await response.json()) as HomepageContentData;
			const normalized = JSON.parse(JSON.stringify(savedData)) as HomepageContentData;
			setContent(normalized);
			setInitialContent(normalized);
			setHasChanges(false);
			setFieldSaveIssues({});
			showSuccessToast("Форма сохранена");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (!initialContent) return;
		setContent(JSON.parse(JSON.stringify(initialContent)));
		setHasChanges(false);
		setFieldSaveIssues({});
	};

	const addFormField = () => {
		if (!content) return;

		const newField: FormField = {
			id: Date.now().toString(),
			type: "text",
			placeholder: "",
			required: false,
		};

		setContent({
			...content,
			formFields: [...content.formFields, newField],
		});
	};

	const removeFormField = (fieldId: string) => {
		if (!content) return;
		setContent({
			...content,
			formFields: content.formFields.filter((f) => f.id !== fieldId),
		});
	};

	const updateFormField = (fieldId: string, updates: Partial<FormField>) => {
		if (!content) return;

		setFieldSaveIssues((prev) => {
			if (!prev[fieldId]) return prev;
			const next = { ...prev };
			delete next[fieldId];
			return next;
		});

		setContent({
			...content,
			formFields: content.formFields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
		});
	};

	const handleDragEnd = (event: DragEndEvent) => {
		if (!content) return;

		const { active, over } = event;
		if (!over || active.id === over.id) return;

		scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
		shouldRestoreScrollRef.current = true;

		const oldIndex = content.formFields.findIndex((f) => f.id === active.id);
		const newIndex = content.formFields.findIndex((f) => f.id === over.id);

		if (oldIndex !== -1 && newIndex !== -1) {
			setContent({
				...content,
				formFields: arrayMove(content.formFields, oldIndex, newIndex),
			});
		}
	};

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
	);

	if (loading) {
		return <div className={editorStyles.editorPlaceholder}>Загрузка...</div>;
	}

	if (!content) {
		return <div className={editorStyles.editorPlaceholder}>Ошибка загрузки данных</div>;
	}

	return (
		<>
			<div className={`formFields ${editorStyles.feedbackEditor}`}>
				{error ? <div className={editorStyles.errorBlock}>{error}</div> : null}

				<section className={editorStyles.sectionCard}>
					<h3 className={editorStyles.sectionTitle}>Кнопка отправки</h3>
					<p className={editorStyles.sectionHint}>
						Одна форма используется на главной, в акциях и в попапе «Оставить заявку». Изменения применяются везде сразу.
					</p>
					<div className={editorStyles.fieldGroup}>
						<label htmlFor="formSubmitButtonText">Текст на кнопке</label>
						<input
							type="text"
							id="formSubmitButtonText"
							value={content.formSubmitButtonText}
							onChange={(e) => setContent({ ...content, formSubmitButtonText: e.target.value })}
							placeholder="Оставить заявку"
						/>
					</div>
				</section>

				<section className={editorStyles.sectionCard}>
					<h3 className={editorStyles.sectionTitle}>Поля формы</h3>
					<p className={editorStyles.sectionHint}>
						Порядок полей на сайте совпадает со списком ниже. Перетащите карточку за иконку слева, чтобы изменить порядок.
					</p>

					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						modifiers={[restrictToVerticalAxis]}
						onDragEnd={handleDragEnd}
						autoScroll={{ enabled: false }}
					>
						<SortableContext items={content.formFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
							<div className={editorStyles.fieldsList}>
								{content.formFields.map((field, index) => (
									<FeedbackFormFieldCard
										key={field.id}
										field={field}
										index={index}
										onRemove={removeFormField}
										onUpdate={updateFormField}
										validationIssues={fieldSaveIssues[field.id]}
									/>
								))}

								{content.formFields.length === 0 ?
									<p className={editorStyles.emptyNote}>Пока нет полей — добавьте первое поле кнопкой ниже.</p>
								:	null}
							</div>
						</SortableContext>
					</DndContext>

					<button type="button" onClick={addFormField} className={editorStyles.addFieldSlot}>
						<Plus size={16} aria-hidden />
						Добавить поле
					</button>
				</section>
			</div>

			{hasChanges ?
				<FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText="Сохранить форму" />
			:	null}
		</>
	);
}
