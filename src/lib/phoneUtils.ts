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

/** Отображение: +7 (999) 999-99-99 — только введённые цифры, без символов-заглушек маски */
export function formatPhoneDisplay(raw: string): string {
	const d = normalizePhoneDigits(raw);
	if (d.length === 0) return "";

	const area = d.slice(0, 3);
	const mid = d.slice(3, 6);
	const part1 = d.slice(6, 8);
	const part2 = d.slice(8, 10);

	if (d.length <= 3) return `+7 (${area}`;
	if (d.length <= 6) return `+7 (${area}) ${mid}`;
	if (d.length <= 8) return `+7 (${area}) ${mid}-${part1}`;
	return `+7 (${area}) ${mid}-${part1}-${part2}`;
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
