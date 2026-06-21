"use client";

import { useRef } from "react";
import styles from "../LegalDocumentsEditor.module.scss";

const ACCEPT =
	".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type LegalDocumentCardProps = {
	title: string;
	routePath: string;
	pageTitleId: string;
	pageTitle: string | null;
	onPageTitleChange: (value: string | null) => void;
	pageTitlePlaceholder: string;
	fileUrl: string | null;
	uploading: boolean;
	onPickFile: (file: File | null) => void;
	onClearFile: () => void;
};

function fileNameFromUrl(url: string): string {
	try {
		const segment = url.split("/").pop() || "Документ";
		return decodeURIComponent(segment.split("?")[0] || segment);
	} catch {
		return "Документ";
	}
}

function fileExtLabel(url: string): string {
	const name = fileNameFromUrl(url);
	const ext = name.split(".").pop()?.toUpperCase();
	if (ext && ["PDF", "DOC", "DOCX"].includes(ext)) return ext;
	return "DOC";
}

export default function LegalDocumentCard({
	title,
	routePath,
	pageTitleId,
	pageTitle,
	onPageTitleChange,
	pageTitlePlaceholder,
	fileUrl,
	uploading,
	onPickFile,
	onClearFile,
}: LegalDocumentCardProps) {
	const fileRef = useRef<HTMLInputElement | null>(null);

	const openPicker = () => fileRef.current?.click();

	return (
		<section className={styles.docCard}>
			<div className={styles.docCardHead}>
				<h3 className={styles.docCardTitle}>{title}</h3>
				<span className={styles.routeBadge}>{routePath}</span>
			</div>

			<div className={styles.fieldGroup}>
				<label htmlFor={pageTitleId}>Заголовок на странице</label>
				<input
					id={pageTitleId}
					type="text"
					value={pageTitle ?? ""}
					onChange={(e) => onPageTitleChange(e.target.value.trim() || null)}
					placeholder={pageTitlePlaceholder}
				/>
				<p className={styles.fieldHint}>Необязательно — если пусто, используется стандартный заголовок.</p>
			</div>

			<div className={styles.fieldGroup}>
				<p className={styles.fileLabel}>Файл документа</p>
				<p className={styles.fieldHint}>PDF, DOC или DOCX — откроется на отдельной странице сайта.</p>

				<input
					type="file"
					hidden
					ref={fileRef}
					accept={ACCEPT}
					onChange={(e) => {
						const file = e.target.files?.[0] ?? null;
						e.target.value = "";
						onPickFile(file);
					}}
				/>

				{fileUrl ?
					<div className={styles.fileAttached}>
						<div className={styles.fileAttachedMain}>
							<span className={styles.fileIcon}>{fileExtLabel(fileUrl)}</span>
							<div className={styles.fileMeta}>
								<span className={styles.fileName}>{fileNameFromUrl(fileUrl)}</span>
								<span className={styles.fileStatus}>Файл загружен и будет показан на сайте после сохранения</span>
							</div>
						</div>
						<div className={styles.fileActions}>
							<button type="button" className={styles.fileActionPrimary} disabled={uploading} onClick={openPicker}>
								{uploading ? "Загрузка…" : "Заменить"}
							</button>
							<a href={fileUrl} target="_blank" rel="noopener noreferrer" className={styles.fileActionLink}>
								Открыть
							</a>
							<button type="button" className={styles.fileActionRemove} onClick={onClearFile}>
								Убрать
							</button>
						</div>
					</div>
				:	<button type="button" className={styles.uploadSlot} disabled={uploading} onClick={openPicker}>
						{uploading ? "Загрузка…" : "+ Загрузить файл"}
					</button>
				}
			</div>
		</section>
	);
}
