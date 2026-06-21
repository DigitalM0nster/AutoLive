"use client";

import styles from "@/app/(site)/styles.module.scss";
import { useUiStore } from "@/store/uiStore";
import { HomepageContentData } from "@/app/api/homepage-content/route";
import { buildHomepageRequestSource, type SiteFormRequestSource } from "@/lib/siteRequestSource";

interface OrderPopupButtonProps {
	buttonText?: string;
	formData?: HomepageContentData;
	className?: string;
	source?: SiteFormRequestSource;
}

export default function OrderPopupButton({
	buttonText = "Оставить заказ",
	formData,
	className,
	source,
}: OrderPopupButtonProps) {
	const { activateOrderPopup } = useUiStore();

	const handleClick = () => {
		if (formData) {
			useUiStore.setState({ homepageFormData: formData });
		}
		activateOrderPopup(source ?? buildHomepageRequestSource());
	};

	return (
		<button type="button" className={className ?? styles.button} onClick={handleClick}>
			{buttonText}
		</button>
	);
}
