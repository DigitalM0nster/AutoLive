/**
 * Отправка SMS-кодов.
 *
 * Переменные окружения:
 * - SMS_PROVIDER=smsc + SMSC_LOGIN + SMSC_PASSWORD — реальная отправка через smsc.ru
 * - Если smsc не настроен — код возвращается клиенту для теста (alert на регистрации)
 */

export type SendSmsResult = {
	sent: boolean;
	/** Код для теста, пока SMS-сервис не подключён */
	testCode?: string;
	smsNotConnected?: boolean;
	message?: string;
};

function isSmscConfigured(): boolean {
	return (
		process.env.SMS_PROVIDER === "smsc" &&
		Boolean(process.env.SMSC_LOGIN?.trim()) &&
		Boolean(process.env.SMSC_PASSWORD?.trim())
	);
}

async function sendViaSmsc(phone: string, text: string): Promise<boolean> {
	const login = process.env.SMSC_LOGIN!.trim();
	const password = process.env.SMSC_PASSWORD!.trim();

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

	if (isSmscConfigured()) {
		const ok = await sendViaSmsc(phone, text);
		return ok ? { sent: true } : { sent: false, message: "Не удалось отправить SMS" };
	}

	// SMS-сервис не подключён — код сохранён в БД, показываем пользователю для теста
	return {
		sent: true,
		testCode: code,
		smsNotConnected: true,
	};
}

/** Сброс пароля — отправка нового пароля по SMS */
export async function sendPasswordResetSms(phone: string, newPassword: string): Promise<SendSmsResult> {
	const text = `AutoLive: ваш новый пароль ${newPassword}`;

	if (isSmscConfigured()) {
		const ok = await sendViaSmsc(phone, text);
		return ok ? { sent: true } : { sent: false, message: "Не удалось отправить SMS" };
	}

	return {
		sent: true,
		testCode: newPassword,
		smsNotConnected: true,
	};
}
