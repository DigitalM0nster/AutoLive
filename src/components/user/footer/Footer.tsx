"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPhoneDisplay, isValidPhoneDigits, phoneToTelHref } from "@/lib/phoneUtils";
import { MapPin, Phone } from "lucide-react";
import CONFIG from "@/lib/config";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import styles from "./styles.module.scss";
import {
	defaultFooterContentDisplay,
	formatFooterCopyrightLine,
	footerBlockIsVisible,
	type FooterContentData,
} from "@/lib/footerDisplay";
import { buildFooterLegalLinks, defaultSiteLegalContent, type SiteLegalContentData } from "@/lib/siteLegalContent.shared";
import { COOKIES_POLICY_PATH, PRIVACY_POLICY_PATH } from "@/lib/consentConstants";
import { FOOTER_LUCIDE_BY_KEY } from "@/lib/footerLucideIcons";

const NAV_ITEMS = [
	{ label: "Материалы для ТО", path: "/categories" },
	{ label: "Комплекты ТО", path: "/service-kits" },
	{ label: "Запись на ТО", path: "/booking" },
	{ label: "Запчасти", path: "/products" },
	{ label: "Акции", path: "/promotions" },
	{ label: "Контакты", path: "/contacts" },
];

function stripTrailingColon(text: string): string {
	return text.replace(/:\s*$/, "");
}

export default function Footer() {
	const siteSettings = useSiteSettings();
	const logoUrl = siteSettings?.logoUrl ?? null;
	const [content, setContent] = useState<FooterContentData | null>(null);
	const [legalContent, setLegalContent] = useState<SiteLegalContentData>(defaultSiteLegalContent);

	useEffect(() => {
		let cancelled = false;
		Promise.all([
			fetch("/api/footer-content").then((r) => (r.ok ? r.json() : null)),
			fetch("/api/legal-content").then((r) => (r.ok ? r.json() : null)),
		])
			.then(([footerData, legalData]) => {
				if (cancelled) return;
				if (footerData) setContent(footerData);
				if (legalData) setLegalContent({ ...defaultSiteLegalContent, ...legalData });
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	const effective = content ?? defaultFooterContentDisplay;
	const mainPhone = effective.phone?.trim() ?? "";
	const showPhone = mainPhone !== "" && isValidPhoneDigits(mainPhone);
	const visibleBlocks = (effective.contactBlocks ?? []).filter(footerBlockIsVisible);
	const hasContactColumn = showPhone || visibleBlocks.length > 0;
	const visibleDocuments = buildFooterLegalLinks(legalContent, PRIVACY_POLICY_PATH, COOKIES_POLICY_PATH);
	const copyrightText = formatFooterCopyrightLine(effective.copyrightLine);

	return (
		<footer className={styles.footer}>
			<div className={styles.brandAccent} aria-hidden="true" />

			<div className={styles.footerInner}>
				<div className={styles.footerGrid}>
					<div className={styles.brandColumn}>
						{logoUrl && (
							<Link href="/" className={styles.footerLogo}>
								<img src={logoUrl} alt={CONFIG.STORE_NAME} />
							</Link>
						)}
						<p className={styles.brandName}>
							{CONFIG.STORE_NAME}
							<span className={styles.brandCity}> · {CONFIG.CITY}</span>
						</p>
						<p className={styles.brandDescription}>Автозапчасти, комплекты ТО и сервисное обслуживание</p>
					</div>

					<div className={styles.navColumn}>
						<p className={styles.columnTitle}>Навигация</p>
						<nav className={styles.navList} aria-label="Навигация по сайту">
							{NAV_ITEMS.map((item) => (
								<Link key={item.path} href={item.path} className={styles.navLink}>
									{item.label}
								</Link>
							))}
						</nav>
					</div>

					{hasContactColumn && (
						<div className={styles.contactsColumn}>
							<p className={styles.columnTitle}>Контакты</p>
							<div className={styles.contactsBody}>
								{showPhone && (
									<a className={styles.phoneBlock} href={phoneToTelHref(mainPhone)}>
										<Phone size={18} strokeWidth={1.75} aria-hidden className={styles.phoneIcon} />
										<span className={styles.phoneNumber}>{formatPhoneDisplay(mainPhone)}</span>
									</a>
								)}

								{visibleBlocks.map((block) => {
									const Icon = FOOTER_LUCIDE_BY_KEY[block.icon] ?? MapPin;
									const lines = block.items.filter((i) => i.value.trim() !== "");
									if (lines.length === 0 && !(block.title && block.title.trim() !== "")) return null;

									return (
										<div key={block.id} className={styles.contactGroup}>
											{block.title && block.title.trim() !== "" && (
												<div className={styles.contactGroupTitle}>
													<Icon size={16} strokeWidth={1.75} aria-hidden />
													<span>{stripTrailingColon(block.title.trim())}</span>
												</div>
											)}
											{lines.length > 0 && (
												<ul className={styles.contactGroupList}>
													{lines.map((item, i) => (
														<li key={`${block.id}-${i}`}>
															{item.type === "phone" && isValidPhoneDigits(item.value) ?
																<a className={styles.contactLineLink} href={phoneToTelHref(item.value)}>
																	{formatPhoneDisplay(item.value)}
																</a>
															: item.type === "phone" ?
																<span className={styles.contactLineText}>{formatPhoneDisplay(item.value)}</span>
															:	<span className={styles.contactLineText}>{item.value}</span>}
														</li>
													))}
												</ul>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>

				<div className={styles.footerBottom}>
					<div className={styles.footerCopyright}>{copyrightText}</div>
					{visibleDocuments.length > 0 && (
						<div className={styles.documentsRow}>
							{visibleDocuments.map((doc) => (
								<Link key={doc.id} href={doc.href} className={styles.documentLink}>
									{doc.title}
								</Link>
							))}
						</div>
					)}
				</div>
			</div>
		</footer>
	);
}
