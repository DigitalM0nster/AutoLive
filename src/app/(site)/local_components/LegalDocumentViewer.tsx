"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import styles from "./legalPolicyPageContent.module.scss";

type LegalDocumentViewerProps = {
	fileUrl: string;
	title: string;
	panelId: string;
};

function isPdfUrl(url: string): boolean {
	const lower = url.toLowerCase();
	return lower.includes(".pdf") || url.startsWith("data:application/pdf");
}

export default function LegalDocumentViewer({ fileUrl, title, panelId }: LegalDocumentViewerProps) {
	const [expanded, setExpanded] = useState(false);
	const isPdf = isPdfUrl(fileUrl);

	return (
		<section className={[styles.docCard, expanded ? styles.isExpanded : ""].filter(Boolean).join(" ")}>
			<div className={styles.docCardHead}>
				<p className={styles.docCardHint}>
					{isPdf ?
						"Документ можно просмотреть на этой странице или открыть в отдельной вкладке."
					:	"Файл DOC/DOCX откроется в новой вкладке — встроенный просмотр доступен только для PDF."}
				</p>
				<a className={styles.externalLink} href={fileUrl} target="_blank" rel="noopener noreferrer">
					<span>Открыть в новой вкладке</span>
					<ExternalLink size={16} strokeWidth={2} aria-hidden />
				</a>
			</div>

			{isPdf ?
				<>
					<div className={styles.frameWrap} id={`legal-doc-frame-${panelId}`} aria-hidden={!expanded}>
						<div className={styles.frameWrapInner}>
							{expanded ?
								<iframe className={styles.frame} src={fileUrl} title={title} />
							:	null}
						</div>
					</div>

					<button
						type="button"
						className={styles.expandBar}
						onClick={() => setExpanded((prev) => !prev)}
						aria-expanded={expanded}
						aria-controls={`legal-doc-frame-${panelId}`}
					>
						<span>{expanded ? "Свернуть документ" : "Развернуть документ"}</span>
						<ChevronDown size={18} strokeWidth={2} className={styles.expandIcon} aria-hidden />
					</button>
				</>
			:	null}
		</section>
	);
}
