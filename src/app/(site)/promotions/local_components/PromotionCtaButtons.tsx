"use client";

import Link from "next/link";
import siteStyles from "@/app/(site)/styles.module.scss";
import OrderPopupButton from "@/components/user/orderPopup/OrderPopupButton";
import { HomepageContentData } from "@/app/api/homepage-content/route";
import { parsePromotionButtons, type PromotionButton } from "@/lib/promotionButtons";
import { formatPhoneDisplay, phoneToTelHref } from "@/lib/phoneUtils";
import { buildPromotionRequestSource } from "@/lib/siteRequestSource";
import heroStyles from "./PromotionsHeroBanner.module.scss";
import detailStyles from "../styles.module.scss";

type PromotionCtaButtonsProps = {
	buttonsJson?: string | null;
	buttons?: PromotionButton[];
	promotionId: number;
	promotionTitle: string;
	formData?: HomepageContentData;
	variant?: "hero" | "detail";
};

export default function PromotionCtaButtons({
	buttonsJson,
	buttons: buttonsProp,
	promotionId,
	promotionTitle,
	formData,
	variant = "hero",
}: PromotionCtaButtonsProps) {
	const buttons = buttonsProp ?? parsePromotionButtons(buttonsJson);

	if (buttons.length === 0) return null;

	const rowClass = variant === "hero" ? heroStyles.heroCtaRow : detailStyles.detailActions;

	return (
		<div className={rowClass}>
			{buttons.map((button, index) => {
				if (button.type === "phone") {
					const phoneHref = phoneToTelHref(button.label);
					const phoneReady = phoneHref !== "#";
					const phoneLabel = formatPhoneDisplay(button.label);

					return phoneReady ? (
						<Link
							key={button.id}
							href={phoneHref}
							className={[siteStyles.button, siteStyles.buttonOutline, variant === "hero" ? heroStyles.heroPhoneButton : detailStyles.detailPhoneButton]
								.filter(Boolean)
								.join(" ")}
						>
							<span className={siteStyles.buttonIcon}>
								<img src="/images/phoneIcon.svg" alt="" aria-hidden="true" />
							</span>
							<span>{phoneLabel}</span>
						</Link>
					) : (
						<span
							key={button.id}
							className={[siteStyles.button, siteStyles.buttonOutline, siteStyles.buttonDisabled, variant === "hero" ? heroStyles.heroPhoneButton : detailStyles.detailPhoneButton]
								.filter(Boolean)
								.join(" ")}
						>
							<span className={siteStyles.buttonIcon}>
								<img src="/images/phoneIcon.svg" alt="" aria-hidden="true" />
							</span>
							<span>{phoneLabel || "+7"}</span>
						</span>
					);
				}

				if (button.type === "request") {
					const requestClassName =
						variant === "hero"
							? [heroStyles.heroCta, index > 0 ? heroStyles.heroCtaSecondary : ""].filter(Boolean).join(" ")
							: [siteStyles.button, siteStyles.buttonPrimary, detailStyles.detailButton].join(" ");

					return (
						<OrderPopupButton
							key={button.id}
							buttonText={button.label}
							formData={formData}
							source={buildPromotionRequestSource(promotionId, promotionTitle)}
							className={requestClassName}
						/>
					);
				}

				const href = button.type === "internal" ? (button.internalPath ?? "").trim() : (button.href ?? "").trim();
				if (!href) return null;

				const openInNewTab = Boolean(button.openInNewTab);
				const className =
					variant === "hero"
						? [heroStyles.heroCta, index > 0 ? heroStyles.heroCtaSecondary : ""].filter(Boolean).join(" ")
						: `button ${detailStyles.detailButton}`;

				if (openInNewTab) {
					return (
						<a key={button.id} href={href} className={className} target="_blank" rel="noopener noreferrer">
							{button.label}
						</a>
					);
				}

				return (
					<Link key={button.id} href={href} className={className}>
						{button.label}
					</Link>
				);
			})}
		</div>
	);
}
