/**
 * Нормализация и единый формат телефона для сайта: +7 (999) 999-99-99
 */

/** Оставляет только цифры; для РФ убирает ведущую 7/8, возвращает до 10 цифр номера */
export function normalizePhoneDigits(raw: string): string {
	let d = raw.replace(/\D/g, "");
	if (d.length >= 11 && (d.startsWith("7") || d.startsWith("8"))) {
		d = d.slice(1);
	}
	return d.slice(0, 10);
}

/** 10 цифр для хранения в БД и API */
export function phoneForStorage(raw: string): string {
	return normalizePhoneDigits(raw);
}

/** Отображение: +7 (999) 999-99-99 */
export function formatPhoneDisplay(raw: string): string {
	const d = normalizePhoneDigits(raw);
	if (d.length === 0) return "";
	const mask = "+7 (___) ___-__-__".split("");
	let di = 0;
	for (let i = 0; i < mask.length; i++) {
		if (mask[i] === "_" && di < d.length) {
			mask[i] = d[di++];
		}
	}
	return mask.join("");
}

/** tel: ссылка */
export function phoneToTelHref(raw: string): string {
	const d = normalizePhoneDigits(raw);
	if (d.length < 10) return "#";
	return `tel:+7${d}`;
}

export function isValidPhoneDigits(raw: string): boolean {
	return normalizePhoneDigits(raw).length === 10;
}
