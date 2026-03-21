export function formatMoney(n: number): string {
	return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);
}

export function formatDateTime(iso: string): string {
	try {
		const d = new Date(iso);
		return new Intl.DateTimeFormat("ru-RU", {
			day: "2-digit",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(d);
	} catch {
		return iso;
	}
}

export function formatDateRu(isoDate: string): string {
	try {
		const d = new Date(isoDate);
		return new Intl.DateTimeFormat("ru-RU", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		}).format(d);
	} catch {
		return isoDate;
	}
}
