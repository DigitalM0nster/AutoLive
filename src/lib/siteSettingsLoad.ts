// Единый запрос настроек сайта для клиента: один fetch на загрузку страницы
// (SitePreloader + SiteSettingsProvider используют одну и ту же «in-flight» промису).

import type { SiteSettingsData } from "@/app/api/site-settings/route";

let resolved: SiteSettingsData | null | undefined;
let inflight: Promise<SiteSettingsData | null> | null = null;

/**
 * Возвращает настройки сайта; повторные вызовы до завершения — тот же Promise.
 */
export function getSiteSettings(): Promise<SiteSettingsData | null> {
	if (resolved !== undefined) {
		return Promise.resolve(resolved);
	}
	if (!inflight) {
		inflight = fetch("/api/site-settings")
			.then((res) => (res.ok ? res.json() : null))
			.then((data: SiteSettingsData | null) => {
				resolved = data;
				inflight = null;
				return data;
			})
			.catch(() => {
				resolved = null;
				inflight = null;
				return null;
			});
	}
	return inflight;
}

/** Для тестов / крайних случаев (обычно не нужно). */
export function resetSiteSettingsCacheForTests() {
	resolved = undefined;
	inflight = null;
}
