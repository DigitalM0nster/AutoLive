// Только данные без Prisma — безопасно импортировать из Client Components

/** Ответ API и состояние формы в админке / ЛК */
export type SiteLegalContentData = {
	privacyPolicyTitle: string | null;
	privacyPolicyFileUrl: string | null;
	cookiesPolicyTitle: string | null;
	cookiesPolicyFileUrl: string | null;
};

type SiteLegalRow = {
	privacyPolicyTitle: string | null;
	privacyPolicyFileUrl: string | null;
	cookiesPolicyTitle: string | null;
	cookiesPolicyFileUrl: string | null;
};

export const defaultSiteLegalContent: SiteLegalContentData = {
	privacyPolicyTitle: null,
	privacyPolicyFileUrl: null,
	cookiesPolicyTitle: null,
	cookiesPolicyFileUrl: null,
};

export function siteLegalRowToDto(row: SiteLegalRow | null): SiteLegalContentData {
	if (!row) return { ...defaultSiteLegalContent };
	return {
		privacyPolicyTitle: row.privacyPolicyTitle ?? null,
		privacyPolicyFileUrl: row.privacyPolicyFileUrl ?? null,
		cookiesPolicyTitle: row.cookiesPolicyTitle ?? null,
		cookiesPolicyFileUrl: row.cookiesPolicyFileUrl ?? null,
	};
}

function trimToNull(v: unknown, maxLen: number): string | null {
	if (v == null) return null;
	const s = String(v).trim();
	if (!s) return null;
	return s.slice(0, maxLen);
}

/** Нормализация тела POST из админки */
export function parseSiteLegalContentBody(body: unknown): SiteLegalContentData {
	if (!body || typeof body !== "object") return { ...defaultSiteLegalContent };
	const o = body as Record<string, unknown>;
	return {
		privacyPolicyTitle: trimToNull(o.privacyPolicyTitle, 255),
		privacyPolicyFileUrl: trimToNull(o.privacyPolicyFileUrl, 1000),
		cookiesPolicyTitle: trimToNull(o.cookiesPolicyTitle, 255),
		cookiesPolicyFileUrl: trimToNull(o.cookiesPolicyFileUrl, 1000),
	};
}
