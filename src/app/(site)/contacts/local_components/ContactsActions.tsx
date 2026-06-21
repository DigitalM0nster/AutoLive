"use client";

import Link from "next/link";
import OrderPopupButton from "@/components/user/orderPopup/OrderPopupButton";
import type { HomepageContentData } from "@/app/api/homepage-content/route";
import { buildContactsRequestSource } from "@/lib/siteRequestSource";
import styles from "../styles.module.scss";

type Props = {
	orderButtonText?: string;
	formData?: HomepageContentData;
};

export default function ContactsActions({ orderButtonText, formData }: Props) {
	const orderLabel = orderButtonText?.trim() || "Оставить заявку";

	return (
		<div className={styles.contactsActions}>
			<Link href="/booking" className={styles.contactsActionSecondary}>
				Записаться на ТО
			</Link>
			<OrderPopupButton
				buttonText={orderLabel}
				formData={formData}
				className={styles.contactsActionPrimary}
				source={buildContactsRequestSource()}
			/>
		</div>
	);
}
