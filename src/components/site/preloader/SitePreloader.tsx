"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSiteSettings } from "@/lib/siteSettingsLoad";
import CONFIG from "@/lib/config";
import styles from "./SitePreloader.module.scss";

type Phase = "loading" | "hiding" | "done";
const PRELOADER_MAX_WAIT_MS = 5000;

/**
 * Первый экран загрузки: ждём настройки сайта (цвета, лого) и сессию пользователя,
 * затем плавно скрываем оверлей. Повторные переходы по сайту (Next) не трогают —
 * компонент остаётся смонтированным в layout с phase "done".
 */
export default function SitePreloader({ children }: { children: ReactNode }) {
	const [phase, setPhase] = useState<Phase>("loading");

	useEffect(() => {
		let cancelled = false;

		const withTimeout = async (promise: Promise<unknown>, timeoutMs: number) => {
			return await Promise.race([
				promise,
				new Promise((resolve) => {
					window.setTimeout(resolve, timeoutMs);
				}),
			]);
		};

		const run = async () => {
			try {
				// Не держим прелоадер бесконечно, если сеть "подвисла".
				await withTimeout(Promise.all([useAuthStore.getState().initAuth(), getSiteSettings()]), PRELOADER_MAX_WAIT_MS);
			} catch {
				/* сеть/401 — всё равно показываем сайт */
			}

			if (cancelled) return;

			if (typeof document !== "undefined" && document.fonts?.ready) {
				try {
					await document.fonts.ready;
				} catch {
					/* старые браузеры */
				}
			}

			if (cancelled) return;

			requestAnimationFrame(() => {
				if (cancelled) return;
				setPhase("hiding");
				window.setTimeout(() => {
					if (!cancelled) setPhase("done");
				}, 380);
			});
		};

		void run();
		return () => {
			cancelled = true;
		};
	}, []);

	const showOverlay = phase === "loading" || phase === "hiding";

	return (
		<div className={styles.root}>
			{children}
			{showOverlay && (
				<div
					className={`${styles.overlay} ${phase === "hiding" ? styles.overlayHiding : ""}`.trim()}
					role="progressbar"
					aria-busy={phase === "loading"}
					aria-label="Загрузка сайта"
				>
					<div className={styles.panel}>
						<div className={styles.spinner} aria-hidden />
						<p className={styles.caption}>Загрузка…</p>
						<p className={styles.subCaption}>
							{CONFIG.STORE_NAME} · {CONFIG.CITY}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
