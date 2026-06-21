"use client";

import { useEffect, useState } from "react";
import { HomepageContentData } from "@/app/api/homepage-content/route";
import { parsePromotionButtons, type PromotionButton } from "@/lib/promotionButtons";
import PromotionCtaButtons from "./PromotionCtaButtons";

type Props = {
	promotionId: number;
	promotionTitle: string;
	buttonsJson?: string | null;
};

export default function PromotionDetailActions({ promotionId, promotionTitle, buttonsJson }: Props) {
	const [formData, setFormData] = useState<HomepageContentData | undefined>();
	const buttons: PromotionButton[] = parsePromotionButtons(buttonsJson);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch("/api/homepage-content");
				if (!res.ok || cancelled) return;
				setFormData(await res.json());
			} catch {
				// форма подтянется в попапе при открытии
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	if (buttons.length === 0) return null;

	return (
		<PromotionCtaButtons
			buttons={buttons}
			promotionId={promotionId}
			promotionTitle={promotionTitle}
			formData={formData}
			variant="detail"
		/>
	);
}
