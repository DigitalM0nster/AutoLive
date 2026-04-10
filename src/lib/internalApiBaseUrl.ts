import { headers } from "next/headers";

/**
 * Абсолютный origin для fetch из Server Components к собственным `/api/*`.
 * В Node относительный URL без базы невалиден; NEXT_PUBLIC_BASE_URL может быть не задан локально.
 */
export async function getInternalApiBaseUrl(): Promise<string> {
	const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
	if (fromEnv) {
		return fromEnv.replace(/\/$/, "");
	}

	const h = await headers();
	const host = h.get("x-forwarded-host") ?? h.get("host");
	if (!host) {
		const port = process.env.PORT || "3000";
		return `http://127.0.0.1:${port}`;
	}

	const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
	return `${proto}://${host}`;
}
