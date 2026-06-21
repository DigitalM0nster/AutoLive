"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "./styles.module.scss";
import OrderPopupButton from "@/components/user/orderPopup/OrderPopupButton";
import { HomepageContentData } from "@/app/api/homepage-content/route";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const DEFAULT_SECOND_BLOCK_TITLE = "Выбрать запчасти самостоятельно";
const DEFAULT_HERO_TITLE = "Связаться с магазином — просто";
const DEFAULT_CALL_BUTTON = "Позвонить в магазин";
const DEFAULT_ORDER_BUTTON = "Оставить заявку";
const DEFAULT_SERVICE_TITLE = "Запись на ТО";
const DEFAULT_SERVICE_SUBTITLE =
	"Выберите удобное время и запишитесь на техническое обслуживание в нашем сервисе";
const DEFAULT_SERVICE_CTA = "Записаться на обслуживание";
const BOOKING_LINK = "/booking";

const CATEGORY_ITEMS = [
	{ name: "Материалы для ТО", desc: "Масла, фильтры и расходники", link: "/categories", img: "/images/maslo.svg" },
	{ name: "Комплекты ТО", desc: "Готовые наборы для обслуживания", link: "/service-kits", img: "/images/boxes.svg" },
	{ name: "Запчасти", desc: "Детали и комплектующие", link: "/products", img: "/images/tormoz.svg" },
] as const;

type HomePageContentProps = {
	firstBlockTitle: string;
	secondBlockTitle: string;
	callButtonText: string;
	orderButtonText: string;
	serviceBlockTitle: string;
	serviceBlockSubtitle: string;
	serviceBlockCtaText: string;
	serviceBlockImageUrl: string | null;
	formData?: HomepageContentData;
};

function CategoryGrid() {
	return (
		<div className={styles.categoryGrid}>
			{CATEGORY_ITEMS.map((item) => (
				<Link href={item.link} key={item.link} className={styles.categoryCard}>
					<div className={styles.categoryIcon}>
						<img src={item.img} alt="" aria-hidden="true" />
					</div>
					<div className={styles.categoryBody}>
						<div className={styles.categoryTitle}>{item.name}</div>
						<p className={styles.categoryDesc}>{item.desc}</p>
					</div>
					<div className={styles.categoryFooter}>
						<span className={styles.categoryArrow} aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
								<path d="M9 7H17V15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</span>
					</div>
				</Link>
			))}
		</div>
	);
}

function HeroSection({ firstBlockTitle, callButtonText, orderButtonText, formData }: Pick<HomePageContentProps, "firstBlockTitle" | "callButtonText" | "orderButtonText" | "formData">) {
	const siteSettings = useSiteSettings();
	const callLabel = callButtonText.trim() || DEFAULT_CALL_BUTTON;
	const orderLabel = orderButtonText.trim() || DEFAULT_ORDER_BUTTON;
	const showCallButton = callButtonText.trim() !== "" || !formData;
	const showOrderButton = orderButtonText.trim() !== "" || !formData;
	const displayTitle = firstBlockTitle.trim() || DEFAULT_HERO_TITLE;

	const phoneRaw = siteSettings?.headerPhone?.replace(/\D/g, "").replace(/^8/, "7");
	const phoneHref = phoneRaw ? `tel:${phoneRaw}` : null;

	return (
		<section className={styles.heroSection} aria-label="Связь с магазином">
			<h1 className={styles.heroTitle}>{displayTitle}</h1>

			<div className={styles.heroMedia}>
				<video src="/videos/storeVideo.mp4" muted loop autoPlay playsInline controls={false} aria-hidden="true" />
				<div className={styles.heroOverlay} aria-hidden="true" />

				<div className={styles.liveBadge}>
					<span className={styles.liveBadgeDot} aria-hidden="true" />
					<span>Прямой эфир</span>
				</div>

				{(showCallButton || showOrderButton) && (
					<div className={styles.heroActions}>
						{showCallButton &&
							(phoneHref ? (
								<Link href={phoneHref} className={`${styles.button} ${styles.buttonOutline}`}>
									<span className={styles.buttonIcon}>
										<img src="/images/phoneIcon.svg" alt="" aria-hidden="true" />
									</span>
									<span>{callLabel}</span>
								</Link>
							) : (
								<span className={`${styles.button} ${styles.buttonOutline} ${styles.buttonDisabled}`}>
									<span className={styles.buttonIcon}>
										<img src="/images/phoneIcon.svg" alt="" aria-hidden="true" />
									</span>
									<span>{callLabel}</span>
								</span>
							))}
						{showOrderButton && (
							<OrderPopupButton
								buttonText={orderLabel}
								formData={formData}
								className={`${styles.button} ${styles.buttonPrimary}`}
							/>
						)}
					</div>
				)}
			</div>
		</section>
	);
}

function CategoriesSection({ secondBlockTitle }: Pick<HomePageContentProps, "secondBlockTitle">) {
	return (
		<section className={styles.categoriesSection} aria-labelledby="home-categories-heading">
			<div className={styles.sectionHeader}>
				<p className={styles.sectionLabel}>Каталог</p>
				<h2 id="home-categories-heading" className={styles.sectionTitle}>
					{secondBlockTitle}
				</h2>
				<p className={styles.sectionSubtitle}>Выберите раздел и перейдите к нужным товарам</p>
			</div>
			<CategoryGrid />
		</section>
	);
}

function BookingSection({
	serviceBlockTitle,
	serviceBlockSubtitle,
	serviceBlockCtaText,
	serviceBlockImageUrl,
}: Pick<
	HomePageContentProps,
	"serviceBlockTitle" | "serviceBlockSubtitle" | "serviceBlockCtaText" | "serviceBlockImageUrl"
>) {
	const title = serviceBlockTitle.trim() || DEFAULT_SERVICE_TITLE;
	const subtitle = serviceBlockSubtitle.trim() || DEFAULT_SERVICE_SUBTITLE;
	const ctaText = serviceBlockCtaText.trim() || DEFAULT_SERVICE_CTA;
	const hasImage = Boolean(serviceBlockImageUrl?.trim());

	return (
		<section className={styles.bookingSection} aria-labelledby="home-booking-heading">
			<Link
				href={BOOKING_LINK}
				className={[styles.bookingBanner, !hasImage && styles.bookingBannerFallback].filter(Boolean).join(" ")}
			>
				{hasImage && serviceBlockImageUrl && (
					<img src={serviceBlockImageUrl} alt="" className={styles.bookingBannerImage} aria-hidden="true" />
				)}
				<div className={styles.bookingBannerOverlay} aria-hidden="true" />

				<div className={styles.bookingBannerContent}>
					<p className={styles.bookingBannerLabel}>Сервис</p>
					<h2 id="home-booking-heading" className={styles.bookingBannerTitle}>
						{title}
					</h2>
					<p className={styles.bookingBannerDesc}>{subtitle}</p>
					<span className={styles.bookingBannerCta}>
						<span>{ctaText}</span>
						<span className={styles.bookingBannerArrow} aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
								<path d="M9 7H17V15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</span>
					</span>
				</div>
			</Link>
		</section>
	);
}

function HomePageContent({
	firstBlockTitle,
	secondBlockTitle,
	callButtonText,
	orderButtonText,
	serviceBlockTitle,
	serviceBlockSubtitle,
	serviceBlockCtaText,
	serviceBlockImageUrl,
	formData,
}: HomePageContentProps) {
	return (
		<div className={`screenBlock ${styles.screenBlock}`}>
			<HeroSection
				firstBlockTitle={firstBlockTitle}
				callButtonText={callButtonText}
				orderButtonText={orderButtonText}
				formData={formData}
			/>
			<CategoriesSection secondBlockTitle={secondBlockTitle} />
			<BookingSection
				serviceBlockTitle={serviceBlockTitle}
				serviceBlockSubtitle={serviceBlockSubtitle}
				serviceBlockCtaText={serviceBlockCtaText}
				serviceBlockImageUrl={serviceBlockImageUrl}
			/>
		</div>
	);
}

export default function HomePageClient() {
	const [content, setContent] = useState<HomepageContentData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadContent();
	}, []);

	const loadContent = async () => {
		try {
			const response = await fetch("/api/homepage-content");
			if (response.ok) {
				const data = await response.json();
				setContent(data);
			}
		} catch (error) {
			console.error("Ошибка загрузки контента главной страницы:", error);
		} finally {
			setLoading(false);
		}
	};

	if (loading || !content) {
		return (
			<HomePageContent
				firstBlockTitle=""
				secondBlockTitle={DEFAULT_SECOND_BLOCK_TITLE}
				callButtonText={DEFAULT_CALL_BUTTON}
				orderButtonText={DEFAULT_ORDER_BUTTON}
				serviceBlockTitle={DEFAULT_SERVICE_TITLE}
				serviceBlockSubtitle={DEFAULT_SERVICE_SUBTITLE}
				serviceBlockCtaText={DEFAULT_SERVICE_CTA}
				serviceBlockImageUrl={null}
			/>
		);
	}

	return (
		<HomePageContent
			firstBlockTitle={content.firstBlockTitle}
			secondBlockTitle={content.secondBlockTitle?.trim() ? content.secondBlockTitle.trim() : DEFAULT_SECOND_BLOCK_TITLE}
			callButtonText={content.callButtonText}
			orderButtonText={content.orderButtonText}
			serviceBlockTitle={content.serviceBlockTitle?.trim() ? content.serviceBlockTitle : DEFAULT_SERVICE_TITLE}
			serviceBlockSubtitle={content.serviceBlockSubtitle?.trim() ? content.serviceBlockSubtitle : DEFAULT_SERVICE_SUBTITLE}
			serviceBlockCtaText={content.serviceBlockCtaText?.trim() ? content.serviceBlockCtaText : DEFAULT_SERVICE_CTA}
			serviceBlockImageUrl={content.serviceBlockImageUrl?.trim() ? content.serviceBlockImageUrl.trim() : null}
			formData={content}
		/>
	);
}
