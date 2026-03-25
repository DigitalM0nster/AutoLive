"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { SiteSettingsData } from "@/app/api/site-settings/route";
import { getSiteSettings } from "@/lib/siteSettingsLoad";

const SiteSettingsContext = createContext<SiteSettingsData | null>(null);

export function useSiteSettings() {
	return useContext(SiteSettingsContext);
}

// Применяет цвета из настроек к :root (если заданы) и обновляет фавиконку
function applySettings(settings: SiteSettingsData | null) {
	const root = typeof document !== "undefined" ? document.documentElement : null;
	if (!root) return;

	if (settings?.colorPrimary) root.style.setProperty("--site-color-primary", settings.colorPrimary);
	else root.style.removeProperty("--site-color-primary");

	if (settings?.colorSecondary) root.style.setProperty("--site-color-secondary", settings.colorSecondary);
	else root.style.removeProperty("--site-color-secondary");

	if (settings?.colorAccent) root.style.setProperty("--site-color-accent", settings.colorAccent);
	else root.style.removeProperty("--site-color-accent");

	if (settings?.colorContrastLight) root.style.setProperty("--site-color-contrast-light", settings.colorContrastLight);
	else root.style.removeProperty("--site-color-contrast-light");

	// Фавиконка: при наличии URL — создаём/обновляем link, иначе ставим дефолт
	let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-site-settings]');
	const href = settings?.faviconUrl || "/favicon.ico";
	if (!link) {
		link = document.createElement("link");
		link.rel = "icon";
		link.setAttribute("data-site-settings", "true");
		document.head.appendChild(link);
	}
	link.href = href;
}

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
	const [settings, setSettings] = useState<SiteSettingsData | null>(null);

	useEffect(() => {
		let cancelled = false;
		getSiteSettings()
			.then((data) => {
				if (!cancelled && data) {
					setSettings(data);
					applySettings(data);
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	// При смене settings (например после гидрации) повторно применяем
	useEffect(() => {
		applySettings(settings);
	}, [settings]);

	return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>;
}
