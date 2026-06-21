import type { ClipboardEvent } from "react";

export type AddressFormData = {
	name: string;
	address: string;
	phones: string[];
	emails: string[];
	workingHours: string;
	showOnContactsPage: boolean;
	latitude: string;
	longitude: string;
};

/** Вставка координат из буфера в формате «широта, долгота» (как в Яндекс.Картах). */
export function parseCoordsFromPaste(text: string): { latitude: string; longitude: string } | null {
	const match = text.trim().match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
	if (!match) return null;
	return { latitude: match[1]!, longitude: match[2]! };
}

export function handleCoordsPaste(e: ClipboardEvent<HTMLInputElement>, onCoords: (lat: string, lng: string) => void) {
	const parsed = parseCoordsFromPaste(e.clipboardData?.getData("text") ?? "");
	if (parsed) {
		e.preventDefault();
		onCoords(parsed.latitude, parsed.longitude);
	}
}
