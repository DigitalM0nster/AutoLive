"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
	COOKIE_CONSENT_POLICY_VERSION,
	COOKIE_CONSENT_STORAGE_KEY,
	COOKIES_POLICY_PATH,
} from "@/lib/consentConstants";
import styles from "./CookieConsent.module.scss";

type StoredConsent = {
	version: string;
	acceptedAt: number;
};

function readStored(): StoredConsent | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as StoredConsent;
		if (parsed && parsed.version === COOKIE_CONSENT_POLICY_VERSION) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Баннер о cookies: после «Принять» пишем версию в localStorage и не показываем снова,
 * пока версия политики не изменится в consentConstants.
 */
export default function CookieConsent() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		setVisible(!readStored());
	}, []);

	const accept = useCallback(() => {
		const payload: StoredConsent = {
			version: COOKIE_CONSENT_POLICY_VERSION,
			acceptedAt: Date.now(),
		};
		try {
			localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload));
		} catch {
			/* приватный режим и т.п. */
		}
		setVisible(false);
	}, []);

	if (!visible) return null;

	return (
		<div className={styles.banner} role="dialog" aria-labelledby="cookie-consent-title" aria-live="polite">
			<div className={styles.textBlock}>
				<p id="cookie-consent-title" className={styles.title}>
					Файлы cookie
				</p>
				<p className={styles.text}>
					Мы используем cookie, чтобы сайт работал стабильно (сессия, корзина, настройки отображения). Продолжая пользоваться сайтом, вы
					соглашаетесь с их использованием. Подробнее — в{" "}
					<Link href={COOKIES_POLICY_PATH} className={styles.policyLink}>
						политике использования cookie
					</Link>
					.
				</p>
			</div>
			<div className={styles.actions}>
				<button type="button" className={styles.acceptButton} onClick={accept}>
					Принять
				</button>
			</div>
		</div>
	);
}
