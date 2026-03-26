// Общая схема полей формы «Оставить заявку» на главной (ключи FormData + валидация)
import type { FormField } from "@/app/api/homepage-content/route";

export type HomepageRequestPartDef = {
	key: string;
	partType: "text" | "phone" | "textarea" | "file";
	placeholder: string;
	required: boolean;
};

/** Разворачивает поля админки в плоский список ключей для отправки на сервер */
export function formFieldsToPartDefs(fields: FormField[]): HomepageRequestPartDef[] {
	const out: HomepageRequestPartDef[] = [];
	for (const f of fields) {
		if (f.type === "custom") {
			const base = `field-${f.id}`;
			out.push({
				key: `${base}_1`,
				partType: f.firstFieldType || "text",
				placeholder: f.firstFieldPlaceholder || "",
				required: false,
			});
			out.push({
				key: `${base}_2`,
				partType: f.secondFieldType || "file",
				placeholder: f.secondFieldPlaceholder || "",
				required: false,
			});
		} else {
			out.push({
				key: f.id,
				partType: f.type,
				placeholder: f.placeholder,
				required: f.required,
			});
		}
	}
	return out;
}

function hasNonEmptyString(v: unknown): boolean {
	return typeof v === "string" && v.trim().length > 0;
}

function hasNonEmptyFile(v: unknown): boolean {
	return v instanceof File && v.size > 0;
}

/** Проверка «кастомного» блока: обязательно хотя бы одно из двух подполей */
export function customBlockSatisfied(field: FormField, get: (key: string) => unknown): boolean {
	if (field.type !== "custom") return true;
	const base = `field-${field.id}`;
	const v1 = get(`${base}_1`);
	const v2 = get(`${base}_2`);
	const t1 = field.firstFieldType || "text";
	const t2 = field.secondFieldType || "file";
	const ok1 = t1 === "file" ? hasNonEmptyFile(v1) : hasNonEmptyString(v1);
	const ok2 = t2 === "file" ? hasNonEmptyFile(v2) : hasNonEmptyString(v2);
	return ok1 || ok2;
}

export function validatePhoneDigits(raw: string): boolean {
	const d = raw.replace(/\D/g, "");
	return d.length >= 10 && d.length <= 15;
}

/** Серверная/клиентская проверка обязательных полей по схеме из БД */
export function validateHomepageRequestValues(
	fields: FormField[],
	get: (key: string) => unknown,
): { ok: true } | { ok: false; message: string } {
	for (const field of fields) {
		if (field.type === "custom") {
			if (field.required && !customBlockSatisfied(field, get)) {
				return {
					ok: false,
					message: `Заполните поле «${field.placeholder}» (хотя бы одно из двух значений)`,
				};
			}
			continue;
		}
		const v = get(field.id);
		if (field.required) {
			if (field.type === "file") {
				if (!hasNonEmptyFile(v)) {
					return { ok: false, message: `Поле «${field.placeholder}» обязательно` };
				}
			} else {
				if (!hasNonEmptyString(v)) {
					return { ok: false, message: `Поле «${field.placeholder}» обязательно` };
				}
			}
		}
		if (field.type === "phone" && hasNonEmptyString(v) && !validatePhoneDigits(String(v))) {
			return { ok: false, message: "Введите корректный телефон (10–15 цифр)" };
		}
	}
	return { ok: true };
}
