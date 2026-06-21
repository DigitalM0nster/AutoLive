export function formatPromotionPeriod(startDate: string | null, endDate: string | null): string | null {
	const format = (value: string) =>
		new Date(value).toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});

	if (startDate && endDate) {
		return `${format(startDate)} — ${format(endDate)}`;
	}

	if (endDate) {
		return `До ${format(endDate)}`;
	}

	if (startDate) {
		return `С ${format(startDate)}`;
	}

	return null;
}
