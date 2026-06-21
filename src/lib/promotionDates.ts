export function parseOptionalPromotionDate(value: unknown): Date | null {
	if (value === null || value === undefined || value === "") return null;
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return null;
	return date;
}

export function validatePromotionDates(startDate: Date | null, endDate: Date | null): string | null {
	if (startDate && endDate && endDate < startDate) {
		return "Дата окончания не может быть раньше даты начала";
	}
	return null;
}
