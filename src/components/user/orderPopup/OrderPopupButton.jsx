"use client";

import styles from "@/app/(site)/styles.module.scss";
import { useUiStore } from "@/store/uiStore";

export default function OrderPopupButton() {
	const { activateOrderPopup } = useUiStore();

	return (
		<button
			className={`button ${styles.button}`}
			onClick={() => {
				activateOrderPopup();
			}}
		>
			Оставить заказ
		</button>
	);
}
