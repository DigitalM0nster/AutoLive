"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
	Building2,
	FileText,
	Headphones,
	MapPin,
	Phone,
	ShoppingCart,
	Wrench,
	type LucideIcon,
} from "lucide-react";
import styles from "./styles.module.scss";
import {
	defaultFooterContentDisplay,
	formatFooterCopyrightLine,
	footerBlockIsVisible,
	footerPhoneToTelHref,
	type FooterContentData,
	type FooterIconKey,
} from "@/lib/footerDisplay";

const FOOTER_ICONS: Record<FooterIconKey, LucideIcon> = {
	mapPin: MapPin,
	wrench: Wrench,
	phone: Phone,
	building2: Building2,
	shoppingCart: ShoppingCart,
	fileText: FileText,
	headphones: Headphones,
};

export default function Footer() {
	const router = useRouter();
	const [content, setContent] = useState<FooterContentData | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/footer-content")
			.then((r) => (r.ok ? r.json() : null))
			.then((data: FooterContentData | null) => {
				if (!cancelled && data) setContent(data);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	const effective = content ?? defaultFooterContentDisplay;
	const showPhone = Boolean(effective.phone && effective.phone.trim() !== "");
	const visibleBlocks = (effective.contactBlocks ?? []).filter(footerBlockIsVisible);
	const hasContactColumn = showPhone || visibleBlocks.length > 0;
	const visibleDocuments = (effective.documents ?? []).filter((d) => d.title.trim() !== "" && d.fileUrl.trim() !== "");
	const copyrightText = formatFooterCopyrightLine(effective.copyrightLine);

	return (
		<div className={styles.footer}>
			<div className={styles.footerContent}>
				<div className={styles.leftBlock}>
					<div className={styles.blockName}>Навигация по сайту</div>
					<div className={styles.blockContent}>
						<div className={styles.navUl}>
							{[
								{ label: "Материалы для ТО", path: "/categories" },
								{ label: "Комплекты ТО", path: "/service-kits" },
								{ label: "Запись на ТО", path: "/booking" },
								{ label: "Запчасти", path: "/catalog" },
								{ label: "Акции", path: "/promotions" },
								{ label: "Контакты", path: "/contacts" },
							].map((item) => (
								<div key={item.path} className={styles.navLi} onClick={() => router.push(item.path)}>
									{item.label}
								</div>
							))}
						</div>
					</div>
				</div>

				{hasContactColumn && (
					<div className={styles.rightBlock}>
						<div className={styles.blockName}>Контакты</div>
						<div className={styles.blockContent}>
							<div className={styles.contactItems}>
								{showPhone && effective.phone && (
									<a className={`${styles.contactItem} ${styles.phone}`} href={footerPhoneToTelHref(effective.phone)}>
										<div className={styles.iconGroup}>
											<div className={styles.icon}>
												<img src="/images/phoneIcon.svg" alt="" />
											</div>
											<div className={styles.itemName}>{effective.phone}</div>
										</div>
									</a>
								)}

								{visibleBlocks.map((block) => {
									const Icon = FOOTER_ICONS[block.icon] ?? MapPin;
									return (
										<div key={block.id} className={styles.contactItem}>
											<div className={styles.iconGroup}>
												<div className={styles.icon}>
													<Icon size={20} strokeWidth={1.75} aria-hidden />
												</div>
												{block.title && block.title.trim() !== "" && <div className={styles.itemName}>{block.title}</div>}
											</div>
											{block.items.filter((i) => i.value.trim() !== "").length > 0 && (
												<div className={styles.column}>
													{block.items
														.filter((i) => i.value.trim() !== "")
														.map((item, i) =>
															item.type === "phone" ? (
																<a
																	key={`${block.id}-p-${i}`}
																	className={styles.blockLineTel}
																	href={footerPhoneToTelHref(item.value)}
																>
																	{item.value}
																</a>
															) : (
																<div key={`${block.id}-t-${i}`} className={styles.blockLineText}>
																	{item.value}
																</div>
															)
														)}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				)}
			</div>

			{visibleDocuments.length > 0 && (
				<div className={styles.documentsRow}>
					<div className={styles.documentsTitle}>Документы</div>
					<div className={styles.documentsLinks}>
						{visibleDocuments.map((doc) => (
							<a
								key={doc.id}
								href={doc.fileUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={styles.documentLink}
							>
								{doc.title}
							</a>
						))}
					</div>
				</div>
			)}

			<div className={styles.footerCopyright}>{copyrightText}</div>
		</div>
	);
}
