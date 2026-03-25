"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import styles from "../local_components/styles.module.scss";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import type { SiteLegalContentData } from "@/lib/siteLegalContent.shared";
import { defaultSiteLegalContent } from "@/lib/siteLegalContent.shared";

async function uploadLegalDocument(file: File): Promise<string> {
	const formData = new FormData();
	formData.append("document", file);
	const res = await fetch("/api/upload", {
		method: "POST",
		body: formData,
		credentials: "include",
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(typeof data.error === "string" ? data.error : "Ошибка загрузки файла");
	}
	if (typeof data.url !== "string" || !data.url) {
		throw new Error("Сервер не вернул адрес файла");
	}
	return data.url;
}

export default function AdminLegalDocumentsPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [data, setData] = useState<SiteLegalContentData>(defaultSiteLegalContent);
	const [initialData, setInitialData] = useState<SiteLegalContentData>(defaultSiteLegalContent);
	const [error, setError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false);
	const [uploading, setUploading] = useState<"privacy" | "cookies" | null>(null);
	const privacyFileRef = useRef<HTMLInputElement | null>(null);
	const cookiesFileRef = useRef<HTMLInputElement | null>(null);

	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/legal-content");
			if (!res.ok) throw new Error("Ошибка загрузки");
			const json = (await res.json()) as SiteLegalContentData;
			setData({ ...defaultSiteLegalContent, ...json });
			setInitialData(JSON.parse(JSON.stringify({ ...defaultSiteLegalContent, ...json })));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка загрузки");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	useEffect(() => {
		setHasChanges(JSON.stringify(data) !== JSON.stringify(initialData));
	}, [data, initialData]);

	const handleSave = async () => {
		try {
			setSaving(true);
			setError(null);
			const res = await fetch("/api/legal-content", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				const errJson = await res.json().catch(() => ({}));
				throw new Error(typeof errJson.error === "string" ? errJson.error : "Ошибка сохранения");
			}
			const saved = (await res.json()) as SiteLegalContentData;
			setData(saved);
			setInitialData(JSON.parse(JSON.stringify(saved)));
			setHasChanges(false);
			alert("Сохранено");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		setData(JSON.parse(JSON.stringify(initialData)));
		setHasChanges(false);
	};

	const onPickFile = async (kind: "privacy" | "cookies", file: File | null) => {
		if (!file) return;
		try {
			setUploading(kind);
			setError(null);
			const url = await uploadLegalDocument(file);
			if (kind === "privacy") {
				setData((d) => ({ ...d, privacyPolicyFileUrl: url }));
			} else {
				setData((d) => ({ ...d, cookiesPolicyFileUrl: url }));
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Ошибка загрузки");
		} finally {
			setUploading(null);
		}
	};

	const clearFile = (kind: "privacy" | "cookies") => {
		if (kind === "privacy") {
			setData((d) => ({ ...d, privacyPolicyFileUrl: null }));
		} else {
			setData((d) => ({ ...d, cookiesPolicyFileUrl: null }));
		}
	};

	if (loading) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer">
						<div className="tabTitle">Юридические документы</div>
					</div>
					<div className="tableContent">
						<div className={styles.editorPlaceholder}>Загрузка...</div>
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
					<div className="tabTitle">Юридические документы</div>
				</div>
				<div className={`tableContent contentComponent ${styles.contentComponent}`}>
					<div className={`formFields ${styles.formFields}`}>
						{error && <div className={styles.errorBlock}>{error}</div>}

						<p className={styles.addressesSectionHint}>
							Файлы для страниц <code>/privacy</code> и <code>/cookies</code> на сайте. Это отдельный раздел: документы в подвале настраиваются в
							«Подвал» и не заменяют эти политики.
						</p>

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Политика / персональные данные (страница /privacy)</h3>
							<div className="formRow">
								<div className={`formField ${styles.formField} fullWidth`}>
									<label htmlFor="legal-privacy-title">Заголовок на странице (необязательно)</label>
									<input
										id="legal-privacy-title"
										type="text"
										value={data.privacyPolicyTitle ?? ""}
										onChange={(e) => setData({ ...data, privacyPolicyTitle: e.target.value.trim() || null })}
										placeholder="Политика в отношении персональных данных"
									/>
								</div>
							</div>
							<div className="formRow">
								<div className={`formField ${styles.formField} fullWidth`}>
									<label>Файл (PDF, DOC, DOCX)</label>
									<input
										type="file"
										hidden
										ref={privacyFileRef}
										accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
										onChange={(e) => {
											const f = e.target.files?.[0] ?? null;
											e.target.value = "";
											void onPickFile("privacy", f);
										}}
									/>
									<div className="rowBlock phoneRowBlock">
										<button
											type="button"
											className={`button ${styles.addButton} ${styles.button}`}
											disabled={uploading === "privacy"}
											onClick={() => privacyFileRef.current?.click()}
										>
											{uploading === "privacy" ? "Загрузка…" : data.privacyPolicyFileUrl ? "Заменить файл" : "Загрузить файл"}
										</button>
										{data.privacyPolicyFileUrl ?
											<>
												<a
													href={data.privacyPolicyFileUrl}
													target="_blank"
													rel="noopener noreferrer"
													className={styles.addressesListEdit}
												>
													Открыть файл
												</a>
												<button type="button" className={`button ${styles.removeButton} ${styles.button}`} onClick={() => clearFile("privacy")}>
													Убрать файл
												</button>
											</>
										:	<span className={styles.labelHint}>Файл не выбран</span>}
									</div>
								</div>
							</div>
						</div>

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Политика cookie (страница /cookies)</h3>
							<div className="formRow">
								<div className={`formField ${styles.formField} fullWidth`}>
									<label htmlFor="legal-cookies-title">Заголовок на странице (необязательно)</label>
									<input
										id="legal-cookies-title"
										type="text"
										value={data.cookiesPolicyTitle ?? ""}
										onChange={(e) => setData({ ...data, cookiesPolicyTitle: e.target.value.trim() || null })}
										placeholder="Политика использования файлов cookie"
									/>
								</div>
							</div>
							<div className="formRow">
								<div className={`formField ${styles.formField} fullWidth`}>
									<label>Файл (PDF, DOC, DOCX)</label>
									<input
										type="file"
										hidden
										ref={cookiesFileRef}
										accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
										onChange={(e) => {
											const f = e.target.files?.[0] ?? null;
											e.target.value = "";
											void onPickFile("cookies", f);
										}}
									/>
									<div className="rowBlock phoneRowBlock">
										<button
											type="button"
											className={`button ${styles.addButton} ${styles.button}`}
											disabled={uploading === "cookies"}
											onClick={() => cookiesFileRef.current?.click()}
										>
											{uploading === "cookies" ? "Загрузка…" : data.cookiesPolicyFileUrl ? "Заменить файл" : "Загрузить файл"}
										</button>
										{data.cookiesPolicyFileUrl ?
											<>
												<a
													href={data.cookiesPolicyFileUrl}
													target="_blank"
													rel="noopener noreferrer"
													className={styles.addressesListEdit}
												>
													Открыть файл
												</a>
												<button type="button" className={`button ${styles.removeButton} ${styles.button}`} onClick={() => clearFile("cookies")}>
													Убрать файл
												</button>
											</>
										:	<span className={styles.labelHint}>Файл не выбран</span>}
									</div>
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
