// Версии согласий — при смене текста политики увеличить, чтобы снова показать баннер (cookies) при необходимости

/** Ключ localStorage для баннера cookies */
export const COOKIE_CONSENT_STORAGE_KEY = "autolive_site_cookie_consent";

/** Версия текста политики cookies (строка для сравнения в stored JSON) */
export const COOKIE_CONSENT_POLICY_VERSION = "1";

/** Публичные страницы с юридическими текстами (контент готовит заказчик) */
export const PRIVACY_POLICY_PATH = "/privacy";
export const COOKIES_POLICY_PATH = "/cookies";
