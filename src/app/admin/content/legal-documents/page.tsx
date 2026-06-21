"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import styles from "../local_components/styles.module.scss";
import editorStyles from "./LegalDocumentsEditor.module.scss";
import LegalDocumentCard from "./local_components/LegalDocumentCard";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import { showSuccessToast } from "@/components/ui/toast/ToastProvider";
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

	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/legal-content");
			if (!res.ok) throw new Error("Ошибка загрузки");
			const json = (await res.json()) as SiteLegalContentData;
			const normalized = { ...defaultSiteLegalContent, ...json };
			setData(normalized);
			setInitialData(JSON.parse(JSON.stringify(normalized)));
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
			showSuccessToast("Юридические документы сохранены");
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

	const renderShell = (children: ReactNode) => (
		<div className="screenContent">
			<div className="tableContainer legalDocumentsPage">
				<div className="tabsContainer column">
					<Link href="/admin/dashboard" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						На панель
					</Link>
					<div className="tabTitle">Юридические документы</div>
				</div>
				<div className="tableContent">{children}</div>
			</div>
		</div>
	);

	if (loading) {
		return renderShell(<div className={styles.editorPlaceholder}>Загрузка...</div>);
	}

	return (
		<div className="screenContent">
			<div className="tableContainer legalDocumentsPage">
				<div className="tabsContainer column">
					<Link href="/admin/dashboard" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						На панель
					</Link>
					<div className="tabTitle">Юридические документы</div>
					<p className={editorStyles.tabsHint}>
						Все юридические документы сайта: страницы <code>/privacy</code> и <code>/cookies</code>, а также ссылки на них в подвале.
					</p>
				</div>

				<div className={`tableContent contentComponent ${styles.contentComponent} ${editorStyles.legalEditor}`}>
					<div className="formFields">
						{error && <div className={editorStyles.errorBlock}>{error}</div>}

						<LegalDocumentCard
							title="Политика персональных данных"
							routePath="/privacy"
							pageTitleId="legal-privacy-title"
							pageTitle={data.privacyPolicyTitle}
							onPageTitleChange={(value) => setData({ ...data, privacyPolicyTitle: value })}
							pageTitlePlaceholder="Политика в отношении персональных данных"
							fileUrl={data.privacyPolicyFileUrl}
							uploading={uploading === "privacy"}
							onPickFile={(file) => void onPickFile("privacy", file)}
							onClearFile={() => clearFile("privacy")}
						/>

						<LegalDocumentCard
							title="Политика cookie"
							routePath="/cookies"
							pageTitleId="legal-cookies-title"
							pageTitle={data.cookiesPolicyTitle}
							onPageTitleChange={(value) => setData({ ...data, cookiesPolicyTitle: value })}
							pageTitlePlaceholder="Политика использования файлов cookie"
							fileUrl={data.cookiesPolicyFileUrl}
							uploading={uploading === "cookies"}
							onPickFile={(file) => void onPickFile("cookies", file)}
							onClearFile={() => clearFile("cookies")}
						/>
					</div>
				</div>
			</div>

			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText="Сохранить изменения" />}
		</div>
	);
}
