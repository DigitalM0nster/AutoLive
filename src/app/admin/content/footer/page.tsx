"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import styles from "../local_components/styles.module.scss";
import editorStyles from "./FooterEditor.module.scss";
import FooterContactBlockCard from "./local_components/FooterContactBlockCard";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";
import { showSuccessToast } from "@/components/ui/toast/ToastProvider";
import { formatPhoneDisplay, isValidPhoneDigits, normalizePhoneDigits, phoneForStorage, phoneToTelHref } from "@/lib/phoneUtils";
import { type FooterContentData, type FooterContactBlock, createEmptyFooterContactBlock, parseFooterContactBlocks } from "@/lib/footerDisplay";
import {
	buildFooterLegalLinks,
	defaultSiteLegalContent,
	type SiteLegalContentData,
} from "@/lib/siteLegalContent.shared";
import { COOKIES_POLICY_PATH, PRIVACY_POLICY_PATH } from "@/lib/consentConstants";

const LEGAL_DOCUMENTS_ADMIN_HREF = "/admin/content/legal-documents";

type FooterFormData = Pick<FooterContentData, "phone" | "contactBlocks" | "copyrightLine">;

function normalizeFooterForm(raw: FooterContentData): FooterFormData {
	const phoneRaw = raw.phone?.trim() || "";
	return {
		phone: phoneRaw ? phoneForStorage(phoneRaw) || null : null,
		contactBlocks: parseFooterContactBlocks(raw.contactBlocks).map((b) => ({
			...b,
			items: b.items.map((it) => ({
				...it,
				value: it.type === "phone" && it.value.trim() ? phoneForStorage(it.value) : it.value,
			})),
		})),
		copyrightLine: raw.copyrightLine,
	};
}

export default function AdminFooterContentPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [data, setData] = useState<FooterFormData | null>(null);
	const [initialData, setInitialData] = useState<FooterFormData | null>(null);
	const [legalPreview, setLegalPreview] = useState<SiteLegalContentData>(defaultSiteLegalContent);
	const [error, setError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false);

	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			const [footerRes, legalRes] = await Promise.all([fetch("/api/footer-content"), fetch("/api/legal-content")]);

			if (!footerRes.ok) throw new Error("Ошибка загрузки данных подвала");

			const content = (await footerRes.json()) as FooterContentData;
			const normalized = normalizeFooterForm(content);
			setData(normalized);
			setInitialData(JSON.parse(JSON.stringify(normalized)));

			if (legalRes.ok) {
				setLegalPreview({ ...defaultSiteLegalContent, ...(await legalRes.json()) });
			}
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

			const payload = {
				...data,
				phone: data.phone ? phoneForStorage(data.phone) || null : null,
				contactBlocks: data.contactBlocks.map((block) => ({
					...block,
					items: block.items.map((item) =>
						item.type === "phone" && item.value.trim() ?
							{ ...item, value: phoneForStorage(item.value) }
						:	item,
					),
				})),
				documents: [] as FooterContentData["documents"],
			};

			const response = await fetch("/api/footer-content", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(typeof errorData.error === "string" ? errorData.error : "Ошибка сохранения");
			}
			const saved = normalizeFooterForm(await response.json());
			setInitialData(JSON.parse(JSON.stringify(saved)));
			setData(saved);
			setHasChanges(false);
			showSuccessToast("Подвал сохранён");
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

	const removeBlock = (index: number) => {
		if (!data) return;
		setData({ ...data, contactBlocks: data.contactBlocks.filter((_, i) => i !== index) });
	};

	const addBlock = () => {
		if (!data) return;
		setData({ ...data, contactBlocks: [...data.contactBlocks, createEmptyFooterContactBlock()] });
	};

	const legalLinks = buildFooterLegalLinks(legalPreview, PRIVACY_POLICY_PATH, COOKIES_POLICY_PATH);

	const renderShell = (children: ReactNode) => (
		<div className="screenContent">
			<div className="tableContainer footerEditorPage">
				<div className="tabsContainer column">
					<Link href="/admin/dashboard" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						На панель
					</Link>
					<div className="tabTitle">Подвал сайта</div>
				</div>
				<div className="tableContent">{children}</div>
			</div>
		</div>
	);

	if (loading) return renderShell(<div className={styles.editorPlaceholder}>Загрузка...</div>);
	if (!data) return renderShell(<div className={styles.editorPlaceholder}>Ошибка загрузки данных</div>);

	const currentYear = new Date().getFullYear();

	return (
		<div className="screenContent">
			<div className="tableContainer footerEditorPage">
				<div className="tabsContainer column">
					<Link href="/admin/dashboard" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						На панель
					</Link>
					<div className="tabTitle">Подвал сайта</div>
					<p className={editorStyles.tabsHint}>
						Телефон, блоки контактов и копирайт. Все юридические документы — в разделе «Юридические документы».
					</p>
				</div>

				<div className={`tableContent contentComponent ${styles.contentComponent} ${editorStyles.footerEditor}`}>
					<div className="formFields">
						{error && <div className={editorStyles.errorBlock}>{error}</div>}

						<section className={editorStyles.sectionCard}>
							<h3 className={editorStyles.sectionTitle}>Основной телефон</h3>
							<p className={editorStyles.sectionHint}>Если заполнено — в подвале показываются иконка и ссылка для звонка. Пустое поле скрывает блок.</p>
							<div className={editorStyles.fieldGroup}>
								<label htmlFor="footer-phone">Номер</label>
								<PhoneInput
									id="footer-phone"
									value={normalizePhoneDigits(data.phone ?? "")}
									onValueChange={(raw) => setData({ ...data, phone: raw.length > 0 ? raw : null })}
								/>
								{isValidPhoneDigits(data.phone ?? "") ?
									<p className={editorStyles.fieldHint}>
										На сайте:{" "}
										<a href={phoneToTelHref(data.phone ?? "")}>{formatPhoneDisplay(data.phone ?? "")}</a>
									</p>
								:	null}
							</div>
						</section>

						<section className={editorStyles.sectionCard}>
							<h3 className={editorStyles.sectionTitle}>Блоки контактов</h3>
							<p className={editorStyles.sectionHint}>
								Колонки в подвале: заголовок, иконка и список строк. Тип «Телефон» на сайте станет ссылкой <code>tel:</code>.
							</p>

							<div className={editorStyles.blocksList}>
								{data.contactBlocks.map((block, index) => (
									<FooterContactBlockCard key={block.id} block={block} index={index} onChange={updateBlock} onRemove={removeBlock} />
								))}
							</div>

							<button type="button" className={editorStyles.addBlockSlot} onClick={addBlock}>
								+ Добавить блок контактов
							</button>
						</section>

						<section className={editorStyles.sectionCard}>
							<h3 className={editorStyles.sectionTitle}>Юридические документы</h3>
							<p className={editorStyles.sectionHint}>
								Политики, файлы и заголовки редактируются только в разделе «Юридические документы». После загрузки они появляются на страницах{" "}
								<code>/privacy</code>, <code>/cookies</code> и в нижней строке подвала.
							</p>

							{legalLinks.length === 0 ?
								<p className={editorStyles.emptyListNote}>Пока нет загруженных документов — добавьте их в «Юридических документах».</p>
							:	<ul className={editorStyles.legalPreviewList}>
									{legalLinks.map((link) => (
										<li key={link.id} className={editorStyles.legalPreviewItem}>
											<span className={editorStyles.legalPreviewTitle}>{link.title}</span>
											<span className={editorStyles.legalPreviewPath}>{link.href}</span>
										</li>
									))}
								</ul>
							}

							<Link href={LEGAL_DOCUMENTS_ADMIN_HREF} className={editorStyles.sectionLink}>
								Перейти к «Юридическим документам»
							</Link>
						</section>

						<section className={editorStyles.sectionCard}>
							<h3 className={editorStyles.sectionTitle}>Копирайт</h3>
							<div className={editorStyles.fieldGroup}>
								<label htmlFor="footer-copyright">Текст внизу подвала</label>
								<input
									id="footer-copyright"
									type="text"
									value={data.copyrightLine ?? ""}
									onChange={(e) => setData({ ...data, copyrightLine: e.target.value.trim() || null })}
									placeholder="Все права защищены © {{year}}"
								/>
								<p className={editorStyles.fieldHint}>
									Подставьте <code>{"{{year}}"}</code> — на сайте автоматически подставится текущий год ({currentYear}).
								</p>
							</div>
						</section>
					</div>
				</div>
			</div>

			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText="Сохранить изменения" />}
		</div>
	);
}
