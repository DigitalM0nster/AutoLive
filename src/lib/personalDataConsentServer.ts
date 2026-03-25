/**
 * Проверка тела запроса: явное согласие на обработку ПДн (строго boolean true).
 * Используется в публичных API, куда пользователь вводит телефон/имя и т.д.
 */
export function hasPersonalDataConsent(body: unknown): boolean {
	if (body === null || typeof body !== "object") return false;
	return (body as { personal_data_consent?: unknown }).personal_data_consent === true;
}

export const PERSONAL_DATA_CONSENT_ERROR = "Необходимо согласие на обработку персональных данных";
