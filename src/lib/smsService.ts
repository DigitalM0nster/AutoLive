/**
 * Отправка SMS-кодов.
 *
 * Переменные окружения:
 * - SMS_PROVIDER: "dev" | "smsc" (по умолчанию "dev" в development)
 * - SMS_DEV_SHOW_CODE: "true" — вернуть код в ответе API (только для разработки)
 * - SMSC_LOGIN, SMSC_PASSWORD — учётные данные smsc.ru (если SMS_PROVIDER=smsc)
 */

export type SendSmsResult = {
	sent: boolean;
	/** Только в dev-режиме, если SMS_DEV_SHOW_CODE=true */
	devCode?: string;
	message?: string;
};

function isDevMode(): boolean {
	return process.env.NODE_ENV === "development" || process.env.SMS_PROVIDER === "dev" || !process.env.SMS_PROVIDER;
}

function shouldExposeDevCode(): boolean {
	return process.env.SMS_DEV_SHOW_CODE === "true" || process.env.NODE_ENV === "development";
}

async function sendViaSmsc(phone: string, text: string): Promise<boolean> {
	const login = process.env.SMSC_LOGIN?.trim();
	const password = process.env.SMSC_PASSWORD?.trim();
	if (!login || !password) {
		console.error("[SMS] SMSC_LOGIN / SMSC_PASSWORD не заданы");
		return false;
	}

	const digits = phone.replace(/\D/g, "");
	const params = new URLSearchParams({
		login,
		psw: password,
		phones: digits.length === 10 ? `7${digits}` : digits,
		mes: text,
		fmt: "3",
	});

	const res = await fetch(`https://smsc.ru/sys/send.php?${params.toString()}`);
	const body = await res.text();
	if (!res.ok || body.includes("ERROR")) {
		console.error("[SMS] smsc.ru error:", body);
		return false;
	}
	return true;
}

/** Отправляет SMS с кодом на номер (phone — 10 цифр без +7) */
export async function sendVerificationCode(phone: string, code: string): Promise<SendSmsResult> {
	const text = `Код подтверждения AutoLive: ${code}`;

	if (isDevMode()) {
		return {
			sent: true,
			devCode: shouldExposeDevCode() ? code : undefined,
		};
	}

	if (process.env.SMS_PROVIDER === "smsc") {
		const ok = await sendViaSmsc(phone, text);
		return ok ? { sent: true } : { sent: false, message: "Не удалось отправить SMS" };
	}

	console.warn("[SMS] Провайдер не настроен, код только в БД");
	return { sent: false, message: "SMS-сервис не настроен. Обратитесь к администратору." };
}

/** Сброс пароля — отправка нового пароля по SMS */
export async function sendPasswordResetSms(phone: string, newPassword: string): Promise<SendSmsResult> {
	const text = `AutoLive: ваш новый пароль ${newPassword}`;

	if (isDevMode()) {
		return {
			sent: true,
			devCode: shouldExposeDevCode() ? newPassword : undefined,
		};
	}

	if (process.env.SMS_PROVIDER === "smsc") {
		const ok = await sendViaSmsc(phone, text);
		return ok ? { sent: true } : { sent: false, message: "Не удалось отправить SMS" };
	}

	return { sent: false, message: "SMS-сервис не настроен" };
}
