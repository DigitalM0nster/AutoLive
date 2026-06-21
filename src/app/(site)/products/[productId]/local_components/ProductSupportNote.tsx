"use client";

import { useUiStore } from "@/store/uiStore";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { phoneToTelHref } from "@/lib/phoneUtils";
import { buildProductRequestSource } from "@/lib/siteRequestSource";
import styles from "../styles.module.scss";

type ProductSupportNoteProps = {
	productTitle: string;
};

export default function ProductSupportNote({ productTitle }: ProductSupportNoteProps) {
	const siteSettings = useSiteSettings();
	const activateOrderPopup = useUiStore((state) => state.activateOrderPopup);

	const phoneHref = siteSettings?.headerPhone ? phoneToTelHref(siteSettings.headerPhone) : "#";
	const canCall = phoneHref !== "#";

	const handleRequestClick = () => {
		activateOrderPopup(buildProductRequestSource(productTitle));
	};

	return (
		<p className={styles.supportNote}>
			Если нужна помощь с подбором,{" "}
			{canCall ?
				<a href={phoneHref} className={styles.supportLink}>
					позвоните нам
				</a>
			:	"позвоните нам"}
			{" "}или{" "}
			<button type="button" className={styles.supportAction} onClick={handleRequestClick}>
				оставьте заявку
			</button>
			.
		</p>
	);
}
