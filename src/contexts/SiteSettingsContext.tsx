"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { SiteSettingsData } from "@/app/api/site-settings/route";

const SiteSettingsContext = createContext<SiteSettingsData | null>(null);

export function useSiteSettings() {
	return useContext(SiteSettingsContext);
}

// Применяет цвета из настроек к :root (если заданы) и обновляет фавиконку
function applySettings(settings: SiteSettingsData | null) {
	const root = typeof document !== "undefined" ? document.documentElement : null;
	if (!root) return;

	if (settings?.colorGrey) root.style.setProperty("--site-color-grey", settings.colorGrey);
	else root.style.removeProperty("--site-color-grey");

	if (settings?.colorGreyLight) root.style.setProperty("--site-color-grey-light", settings.colorGreyLight);
	else root.style.removeProperty("--site-color-grey-light");

	if (settings?.colorGreen) root.style.setProperty("--site-color-green", settings.colorGreen);
	else root.style.removeProperty("--site-color-green");

	if (settings?.colorWhite) root.style.setProperty("--site-color-white", settings.colorWhite);
	else root.style.removeProperty("--site-color-white");

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
		fetch("/api/site-settings")
			.then((res) => (res.ok ? res.json() : null))
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
