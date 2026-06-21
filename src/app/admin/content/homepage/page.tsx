"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../local_components/styles.module.scss";
import { HomepageContentData } from "@/app/api/homepage-content/route";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import ImageUploader from "../promotions/imageUploader";

export default function AdminHomepageContent() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [data, setData] = useState<HomepageContentData | null>(null);
	const [initialData, setInitialData] = useState<HomepageContentData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false);

	useEffect(() => {
		loadData();
	}, []);

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
			data.serviceBlockTitle !== initialData.serviceBlockTitle ||
			data.serviceBlockSubtitle !== initialData.serviceBlockSubtitle ||
			data.serviceBlockCtaText !== initialData.serviceBlockCtaText ||
			data.serviceBlockImageUrl !== initialData.serviceBlockImageUrl;

		setHasChanges(hasDataChanges);
	}, [data, initialData]);

	const loadData = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/homepage-content");
			if (!response.ok) {
				throw new Error("Ошибка загрузки данных");
			}
			const content = await response.json();
			setData(content);
			setInitialData(JSON.parse(JSON.stringify(content)));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка загрузки");
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!data || !initialData) return;

		try {
			setSaving(true);
			setError(null);

			// Блоки главной — форму не перезаписываем (она в отдельном разделе)
			const payload: HomepageContentData = {
				...data,
				formFields: initialData.formFields,
				formSubmitButtonText: initialData.formSubmitButtonText,
			};

			const response = await fetch("/api/homepage-content", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { error?: string };
				throw new Error(errorData.error || "Ошибка сохранения");
			}

			const savedData = await response.json();
			const normalizedSavedData = JSON.parse(JSON.stringify(savedData)) as HomepageContentData;
			setData(normalizedSavedData);
			setInitialData(normalizedSavedData);
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
		setData(JSON.parse(JSON.stringify(initialData)));
		setHasChanges(false);
	};

	if (loading) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer column">
						<Link href="/admin/dashboard" className={styles.backToContentLink}>
							<span className={styles.backToContentLinkArrow} aria-hidden>
								←
							</span>
							На панель
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
						<Link href="/admin/dashboard" className={styles.backToContentLink}>
							<span className={styles.backToContentLinkArrow} aria-hidden>
								←
							</span>
							На панель
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
					<Link href="/admin/dashboard" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						На панель
					</Link>
					<div className="tabTitle">Главная страница</div>
				</div>
				<div className={`tableContent contentComponent ${styles.contentComponent}`}>
					<div className={`formFields ${styles.formFields}`}>
						{error && <div className={styles.errorBlock}>{error}</div>}

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Блоки главной страницы</h3>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="firstBlockTitle">
									Заголовок блока «Связь с магазином» (видео, звонок, заявка) *
								</label>
								<input
									type="text"
									id="firstBlockTitle"
									value={data.firstBlockTitle}
									onChange={(e) => setData({ ...data, firstBlockTitle: e.target.value })}
									placeholder="Например: Поможем подобрать запчасти"
								/>
							</div>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="secondBlockTitle">Заголовок блока «Каталог» (карточки разделов) *</label>
								<input
									type="text"
									id="secondBlockTitle"
									value={data.secondBlockTitle}
									onChange={(e) => setData({ ...data, secondBlockTitle: e.target.value })}
									placeholder="Выбрать запчасти самостоятельно"
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
							<h3 className="formSectionTitle">Блок «Сервис» (баннер записи на ТО)</h3>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="serviceBlockTitle">Заголовок баннера *</label>
								<input
									type="text"
									id="serviceBlockTitle"
									value={data.serviceBlockTitle ?? ""}
									onChange={(e) => setData({ ...data, serviceBlockTitle: e.target.value })}
									placeholder="Запись на ТО"
								/>
							</div>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="serviceBlockSubtitle">Подзаголовок баннера *</label>
								<textarea
									id="serviceBlockSubtitle"
									value={data.serviceBlockSubtitle ?? ""}
									onChange={(e) => setData({ ...data, serviceBlockSubtitle: e.target.value })}
									placeholder="Краткое описание записи на обслуживание"
									rows={3}
								/>
							</div>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="serviceBlockCtaText">Текст кнопки на баннере *</label>
								<input
									type="text"
									id="serviceBlockCtaText"
									value={data.serviceBlockCtaText ?? ""}
									onChange={(e) => setData({ ...data, serviceBlockCtaText: e.target.value })}
									placeholder="Записаться на обслуживание"
								/>
							</div>
							<div className={`formField ${styles.formField}`}>
								<label>Фоновое изображение баннера</label>
								<span className={styles.labelHint}>Рекомендуемый формат: широкое фото сервиса или автомобиля, от 1600×600 px</span>
								<ImageUploader
									imageUrl={data.serviceBlockImageUrl ?? ""}
									setImageUrl={(url) => setData({ ...data, serviceBlockImageUrl: url || null })}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText="Сохранить изменения" />}
		</div>
	);
}
