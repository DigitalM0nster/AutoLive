"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../local_components/styles.module.scss";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import ImageUploader from "@/app/admin/content/promotions/imageUploader";
import type { SiteSettingsData } from "@/app/api/site-settings/route";

// Дефолтные цвета сайта (как в шапке и index.css) — подсказка и fallback при пустом поле
const DEFAULT_COLORS = {
	colorGrey: "#3d3d3d",
	colorGreyLight: "#a9a9a9",
	colorGreen: "#b0cb1f",
	colorWhite: "#ffffff",
} as const;

function hexOrNull(value: string | null | undefined): string {
	if (value == null || value === "") return "";
	const v = String(value).trim();
	return /^#[0-9A-Fa-f]{3,8}$/.test(v) || /^[0-9A-Fa-f]{3,8}$/.test(v) ? (v.startsWith("#") ? v : `#${v}`) : "";
}

export default function AdminSiteSettingsPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [data, setData] = useState<SiteSettingsData | null>(null);
	const [initialData, setInitialData] = useState<SiteSettingsData | null>(null);
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
		const changed =
			data.logoUrl !== initialData.logoUrl ||
			data.faviconUrl !== initialData.faviconUrl ||
			data.headerPhone !== initialData.headerPhone ||
			data.colorGrey !== initialData.colorGrey ||
			data.colorGreyLight !== initialData.colorGreyLight ||
			data.colorGreen !== initialData.colorGreen ||
			data.colorWhite !== initialData.colorWhite;
		setHasChanges(changed);
	}, [data, initialData]);

	const loadData = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/site-settings");
			if (!response.ok) throw new Error("Ошибка загрузки данных");
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
		if (!data) return;
		try {
			setSaving(true);
			setError(null);
			const response = await fetch("/api/site-settings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка сохранения");
			}
			const savedData = await response.json();
			setInitialData(JSON.parse(JSON.stringify(savedData)));
			setHasChanges(false);
			alert("Настройки сохранены!");
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

	const setColor = (key: keyof typeof DEFAULT_COLORS, value: string) => {
		if (!data) return;
		const trimmed = value.trim();
		setData({ ...data, [key]: trimmed === "" ? null : trimmed });
	};

	const colorValue = (key: keyof typeof DEFAULT_COLORS) => {
		const v = data?.[key];
		if (v == null || v === "") return "";
		return hexOrNull(v) || v;
	};

	if (loading) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer">
						<div className="tabTitle">Основные настройки</div>
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
					<div className="tabsContainer">
						<div className="tabTitle">Основные настройки</div>
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
					<div className="tabTitle">Основные настройки</div>
				</div>
				<div className={`tableContent contentComponent ${styles.contentComponent}`}>
					<div className={`formFields ${styles.formFields}`}>
						{error && <div className={styles.errorBlock}>{error}</div>}

						{/* Логотип, фавиконка, телефон в шапке */}
						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Логотип, фавиконка и контакты в шапке</h3>
							<p className={styles.addressesSectionHint}>
								Логотип отображается в шапке сайта. Фавиконка — вкладка браузера. Телефон показывается в шапке рядом с корзиной. Если не заданы, используются
								текущие.
							</p>
							<div className="formRow">
								<div className={`formField ${styles.formField}`}>
									<label>Логотип (шапка)</label>
									<ImageUploader imageUrl={data.logoUrl ?? ""} setImageUrl={(url) => setData({ ...data, logoUrl: url || null })} />
								</div>
							</div>
							<div className="formRow">
								<div className={`formField ${styles.formField}`}>
									<label>Фавиконка</label>
									<ImageUploader imageUrl={data.faviconUrl ?? ""} setImageUrl={(url) => setData({ ...data, faviconUrl: url || null })} />
								</div>
							</div>
							<div className="formRow">
								<div className={`formField ${styles.formField}`}>
									<label>Телефон в шапке (рядом с корзиной)</label>
									<input
										type="text"
										placeholder="+7 (995) 409-18-82"
										value={data.headerPhone ?? ""}
										onChange={(e) => setData({ ...data, headerPhone: e.target.value.trim() || null })}
									/>
								</div>
							</div>
						</div>

						{/* Цвета */}
						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Основные цвета</h3>
							<p className={styles.addressesSectionHint}>
								Сейчас на сайте используются: серый (шапка), серый светлее (второстепенный текст), зелёный (кнопки, акценты), белый. Оставьте поле пустым, чтобы
								использовать текущий цвет.
							</p>
							<div className="formRow">
								<div className={`formField colorRow ${styles.formField} ${styles.colorRow}`}>
									<label>Серый (шапка)</label>
									<input
										type="color"
										value={colorValue("colorGrey") || DEFAULT_COLORS.colorGrey}
										onChange={(e) => setColor("colorGrey", e.target.value)}
										aria-label="Серый"
									/>
									<input
										type="text"
										className={styles.colorHex}
										placeholder={DEFAULT_COLORS.colorGrey}
										value={colorValue("colorGrey")}
										onChange={(e) => setColor("colorGrey", e.target.value)}
									/>
								</div>
							</div>
							<div className="formRow">
								<div className={`formField colorRow ${styles.formField} ${styles.colorRow}`}>
									<label>Серый светлее</label>
									<input
										type="color"
										value={colorValue("colorGreyLight") || DEFAULT_COLORS.colorGreyLight}
										onChange={(e) => setColor("colorGreyLight", e.target.value)}
										aria-label="Серый светлее"
									/>
									<input
										type="text"
										className={styles.colorHex}
										placeholder={DEFAULT_COLORS.colorGreyLight}
										value={colorValue("colorGreyLight")}
										onChange={(e) => setColor("colorGreyLight", e.target.value)}
									/>
								</div>
							</div>
							<div className="formRow">
								<div className={`formField colorRow ${styles.formField} ${styles.colorRow}`}>
									<label>Зелёный</label>
									<input
										type="color"
										value={colorValue("colorGreen") || DEFAULT_COLORS.colorGreen}
										onChange={(e) => setColor("colorGreen", e.target.value)}
										aria-label="Зелёный"
									/>
									<input
										type="text"
										className={styles.colorHex}
										placeholder={DEFAULT_COLORS.colorGreen}
										value={colorValue("colorGreen")}
										onChange={(e) => setColor("colorGreen", e.target.value)}
									/>
								</div>
							</div>
							<div className="formRow">
								<div className={`formField colorRow ${styles.formField} ${styles.colorRow}`}>
									<label>Белый</label>
									<input
										type="color"
										value={colorValue("colorWhite") || DEFAULT_COLORS.colorWhite}
										onChange={(e) => setColor("colorWhite", e.target.value)}
										aria-label="Белый"
									/>
									<input
										type="text"
										className={styles.colorHex}
										placeholder={DEFAULT_COLORS.colorWhite}
										value={colorValue("colorWhite")}
										onChange={(e) => setColor("colorWhite", e.target.value)}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{hasChanges && <FixedActionButtons onSave={handleSave} onCancel={handleCancel} isSaving={saving} saveText="Сохранить изменения" />}
		</div>
	);
}
