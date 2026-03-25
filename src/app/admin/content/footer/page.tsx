"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "../local_components/styles.module.scss";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import {
	type FooterContentData,
	type FooterContactBlock,
	type FooterContactItem,
	type FooterDocument,
	type FooterIconKey,
	FOOTER_ICON_OPTIONS,
	createEmptyFooterContactBlock,
	createEmptyFooterContactItem,
	createEmptyFooterDocument,
	parseFooterContactBlocks,
} from "@/lib/footerDisplay";

/** Раздел «Юридические документы» в меню контента — единое место настройки файлов для подвала и страниц политик */
const LEGAL_DOCUMENTS_ADMIN_HREF = "/admin/content/legal-documents";

/** Документы в форме: сохраняем пустые title/fileUrl до ввода и сохранения */
function normalizeDocumentsForForm(raw: unknown): FooterDocument[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((d) => {
		if (!d || typeof d !== "object") return createEmptyFooterDocument();
		const o = d as Record<string, unknown>;
		return {
			id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : createEmptyFooterDocument().id,
			title: typeof o.title === "string" ? o.title : "",
			fileUrl: typeof o.fileUrl === "string" ? o.fileUrl : "",
		};
	});
}

function normalizeState(raw: FooterContentData): FooterContentData {
	return {
		...raw,
		phone: raw.phone?.trim() || null,
		contactBlocks: parseFooterContactBlocks(raw.contactBlocks).map((b) => ({
			...b,
			items: b.items.map((it) => ({ ...it })),
		})),
		documents: normalizeDocumentsForForm(raw.documents),
		copyrightLine: raw.copyrightLine,
	};
}

export default function AdminFooterContentPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [data, setData] = useState<FooterContentData | null>(null);
	const [initialData, setInitialData] = useState<FooterContentData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false);

	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/footer-content");
			if (!response.ok) throw new Error("Ошибка загрузки данных");
			const content = (await response.json()) as FooterContentData;
			const normalized = normalizeState(content);
			setData(normalized);
			setInitialData(JSON.parse(JSON.stringify(normalized)));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка загрузки");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	useEffect(() => {
		if (!data || !initialData) {
			setHasChanges(false);
			return;
		}
		setHasChanges(JSON.stringify(data) !== JSON.stringify(initialData));
	}, [data, initialData]);

	const handleSave = async () => {
		if (!data) return;
		try {
			setSaving(true);
			setError(null);
			const response = await fetch("/api/footer-content", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(typeof errorData.error === "string" ? errorData.error : "Ошибка сохранения");
			}
			const saved = normalizeState(await response.json());
			setInitialData(JSON.parse(JSON.stringify(saved)));
			setData(saved);
			setHasChanges(false);
			alert("Подвал сохранён!");
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

	const updateBlock = (index: number, patch: Partial<FooterContactBlock>) => {
		if (!data) return;
		const next = [...data.contactBlocks];
		next[index] = { ...next[index], ...patch };
		setData({ ...data, contactBlocks: next });
	};

	const updateItem = (blockIndex: number, itemIndex: number, patch: Partial<FooterContactItem>) => {
		if (!data) return;
		const next = [...data.contactBlocks];
		const items = [...next[blockIndex].items];
		items[itemIndex] = { ...items[itemIndex], ...patch };
		next[blockIndex] = { ...next[blockIndex], items };
		setData({ ...data, contactBlocks: next });
	};

	if (loading) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer">
						<div className="tabTitle">Подвал сайта</div>
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
						<div className="tabTitle">Подвал сайта</div>
					</div>
					<div className="tableContent">
						<div className={styles.editorPlaceholder}>Ошибка загрузки данных</div>
					</div>
				</div>
			</div>
		);
	}

	const currentYear = new Date().getFullYear();

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
					<div className="tabTitle">Подвал сайта</div>
				</div>
				<div className={`tableContent contentComponent ${styles.contentComponent}`}>
					<div className={`formFields ${styles.formFields}`}>
						{error && <div className={styles.errorBlock}>{error}</div>}

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Основной телефон</h3>
							<p className={styles.addressesSectionHint}>
								Если поле заполнено, в подвале показываются иконка телефона и номер со ссылкой для звонка. Если пусто — этот блок скрыт.
							</p>
							<div className="formRow">
								<div className={`formField ${styles.formField}`}>
									<label htmlFor="footer-phone">Телефон</label>
									<input
										id="footer-phone"
										type="text"
										value={data.phone ?? ""}
										onChange={(e) => setData({ ...data, phone: e.target.value.trim() || null })}
										placeholder="+7 (961) 692-88-16"
									/>
								</div>
							</div>
						</div>

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Блоки контактов</h3>
							<p className={styles.addressesSectionHint}>
								Любое количество блоков: заголовок, иконка и список строк. Для строки типа «Телефон» на сайте будет ссылка <code>tel:</code>.
							</p>

							{data.contactBlocks.map((block, bi) => (
								<div key={block.id} className={styles.contactAddressCard}>
									<div className={styles.addressesListName}>Блок {bi + 1}</div>
									<div className="formRow">
										<div className={`formField ${styles.formField} fullWidth`}>
											<label>Заголовок блока</label>
											<input
												type="text"
												value={block.title ?? ""}
												onChange={(e) => updateBlock(bi, { title: e.target.value.trim() || null })}
												placeholder="Например: Пункты выдачи"
											/>
										</div>
									</div>
									<div className="formRow">
										<div className={`formField ${styles.formField}`}>
											<label htmlFor={`footer-block-icon-${block.id}`}>Иконка</label>
											<select
												id={`footer-block-icon-${block.id}`}
												value={block.icon}
												onChange={(e) => updateBlock(bi, { icon: e.target.value as FooterIconKey })}
											>
												{FOOTER_ICON_OPTIONS.map((opt) => (
													<option key={opt.value} value={opt.value}>
														{opt.label}
													</option>
												))}
											</select>
										</div>
									</div>
									<div className="formRow">
										<div className={`formField ${styles.formField} fullWidth`}>
											<label>Строки списка</label>
											<div className="columnList">
												{block.items.map((item, ii) => (
													<div key={`${block.id}-item-${ii}`} className="rowBlock phoneRowBlock">
														<select
															className="little"
															value={item.type}
															onChange={(e) => updateItem(bi, ii, { type: e.target.value as FooterContactItem["type"] })}
															aria-label="Тип строки"
														>
															<option value="text">Текст / адрес</option>
															<option value="phone">Телефон (tel:)</option>
														</select>
														<input
															className="little"
															type="text"
															value={item.value}
															onChange={(e) => updateItem(bi, ii, { value: e.target.value })}
															placeholder={item.type === "phone" ? "+7 …" : "Текст строки"}
														/>
														<button
															type="button"
															className={`button ${styles.removeButton} ${styles.button}`}
															onClick={() => {
																const items = block.items.filter((_, j) => j !== ii);
																updateBlock(bi, { items });
															}}
														>
															Удалить
														</button>
													</div>
												))}
											</div>
											<button
												type="button"
												className={`button ${styles.addButton} ${styles.button}`}
												onClick={() => updateBlock(bi, { items: [...block.items, createEmptyFooterContactItem()] })}
											>
												+ Добавить строку
											</button>
										</div>
									</div>
									<button
										type="button"
										className={`removeButton ${styles.removeAdressButton} ${styles.button}`}
										onClick={() => setData({ ...data, contactBlocks: data.contactBlocks.filter((_, j) => j !== bi) })}
									>
										Удалить блок
									</button>
								</div>
							))}

							<button
								type="button"
								className="button"
								onClick={() => setData({ ...data, contactBlocks: [...data.contactBlocks, createEmptyFooterContactBlock()] })}
							>
								+ Добавить блок контактов
							</button>
						</div>

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Документы в подвале</h3>
							<p className={styles.addressesSectionHint}>
								Здесь документы <strong>не редактируются</strong>. Список файлов и ссылок для блока «Документы» внизу сайта, а также политики для страниц{" "}
								<code>/privacy</code> и <code>/cookies</code>, настраиваются в отдельном разделе меню контента —{" "}
								<strong>«Юридические документы»</strong>.
							</p>
							<p className={styles.addressesSectionHint}>
								<Link href={LEGAL_DOCUMENTS_ADMIN_HREF} className={styles.addressesListEdit}>
									Перейти к разделу «Юридические документы»
								</Link>
							</p>
						</div>

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Копирайт</h3>
							<div className="formRow">
								<div className={`formField ${styles.formField} fullWidth`}>
									<label htmlFor="footer-copyright">Текст внизу подвала</label>
									<input
										id="footer-copyright"
										type="text"
										value={data.copyrightLine ?? ""}
										onChange={(e) => setData({ ...data, copyrightLine: e.target.value.trim() || null })}
										placeholder="Все права защищены © {{year}}"
									/>
									<p className={styles.addressesSectionHint}>
										Подставьте <code>{"{{year}}"}</code> — на сайте автоматически подставится текущий год ({currentYear}). Если поле пустое, покажется строка по
										умолчанию с годом.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText="Сохранить изменения" />}
		</div>
	);
}
