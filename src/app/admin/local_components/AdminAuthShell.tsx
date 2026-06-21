"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import CONFIG from "@/lib/config";
import styles from "../AdminAuth.module.scss";

type Props = {
	formTitle: string;
	formLead: string;
	children: ReactNode;
	footer?: ReactNode;
	backHref?: string;
	backLabel?: string;
};

export default function AdminAuthShell({ formTitle, formLead, children, footer, backHref = "/", backLabel = "На главную сайта" }: Props) {
	const [logoUrl, setLogoUrl] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/site-settings")
			.then((r) => (r.ok ? r.json() : null))
			.then((data: { logoUrl?: string | null } | null) => {
				if (!cancelled && data?.logoUrl) setLogoUrl(data.logoUrl);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className={styles.authPage}>
			<div className={styles.backgroundGlow} aria-hidden="true" />

			<div className={styles.authCard}>
				<div className={styles.cardAccent} aria-hidden="true" />

				<div className={styles.cardHeader}>
					{logoUrl ? (
						<span className={styles.logoWrap}>
							<img src={logoUrl} alt={CONFIG.STORE_NAME} className={styles.logo} />
						</span>
					) : (
						<span className={styles.logoFallback}>{CONFIG.STORE_NAME.charAt(0)}</span>
					)}
					<div className={styles.brandMeta}>
						<p className={styles.brandEyebrow}>Панель управления</p>
						<h1 className={styles.brandTitle}>{CONFIG.STORE_NAME}</h1>
					</div>
				</div>

				<div className={styles.cardBody}>
					<div className={styles.formIntro}>
						<h2 className={styles.formTitle}>{formTitle}</h2>
						<p className={styles.formLead}>{formLead}</p>
					</div>
					{children}
				</div>

				{footer ? <div className={styles.cardFooter}>{footer}</div> : null}
			</div>

			<Link href={backHref} className={styles.backLink}>
				<ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
				{backLabel}
			</Link>
		</div>
	);
}
