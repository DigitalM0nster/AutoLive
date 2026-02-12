"use client";

import styles from "@/app/(site)/styles.module.scss";
import { useUiStore } from "@/store/uiStore";
import { HomepageContentData } from "@/app/api/homepage-content/route";

interface OrderPopupButtonProps {
	buttonText?: string;
	formData?: HomepageContentData;
}

export default function OrderPopupButton({ buttonText = "Оставить заказ", formData }: OrderPopupButtonProps) {
	const { activateOrderPopup } = useUiStore();

	const handleClick = () => {
		// Сохраняем данные формы в store для использования в OrderPopup
		if (formData) {
			useUiStore.setState({ homepageFormData: formData });
		}
		activateOrderPopup();
	};

	return (
		<button className={`button ${styles.button}`} onClick={handleClick}>
			{buttonText}
		</button>
	);
}
