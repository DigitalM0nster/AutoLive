/** Строка записи в поиске для привязки к заказу (ответ /api/bookings/search-for-order) */
export type BookingSearchListRow = {
	id: number;
	scheduledDate: string | Date;
	scheduledTime: string;
	contactPhone: string;
	status: string;
	client: { id: number; first_name: string | null; last_name: string | null; phone: string } | null;
	manager?: { id: number; first_name: string | null; last_name: string | null; phone: string | null } | null;
	bookingDepartment?: { id: number; name: string | null; address: string; phones?: string[] } | null;
};

export function bookingStatusLabelRu(status: string): string {
	const labels: Record<string, string> = {
		scheduled: "Запланирована",
		confirmed: "Подтверждена",
		completed: "Выполнена",
		cancelled: "Отменена",
		no_show: "Не явился",
	};
	return labels[status] || status;
}

/** CSS-модификатор бейджа статуса записи */
export function bookingStatusToneKey(status: string): string {
	const tones: Record<string, string> = {
		scheduled: "toneScheduled",
		confirmed: "toneConfirmed",
		completed: "toneCompleted",
		cancelled: "toneCancelled",
		no_show: "toneNoShow",
	};
	return tones[status] || "toneDefault";
}

export function formatBookingRuDate(value: string | Date): string {
	const iso = typeof value === "string" ? value : value.toISOString();
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (match) return `${match[3]}.${match[2]}.${match[1]}`;
	const date = new Date(value);
	if (isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("ru-RU");
}

export function bookingPersonName(person: { first_name: string | null; last_name: string | null } | null | undefined): string {
	if (!person) return "";
	return [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
}

export function bookingClientLine(row: BookingSearchListRow): string {
	const name = bookingPersonName(row.client);
	const phone = row.contactPhone || row.client?.phone || "";
	if (name && phone) return `${name} · ${phone}`;
	return name || phone || "Контакт не указан";
}

export function bookingManagerLine(row: BookingSearchListRow): string | null {
	const name = bookingPersonName(row.manager);
	if (!name) return null;
	return `Ответственный: ${name}`;
}

export function bookingDepartmentLine(row: BookingSearchListRow): string {
	if (!row.bookingDepartment) return "Отдел не указан";
	return [row.bookingDepartment.name, row.bookingDepartment.address].filter(Boolean).join(" — ") || "Отдел не указан";
}
