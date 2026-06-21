import { formatPhoneDisplay } from "@/lib/phoneUtils";

/** Строка клиента в результатах поиска (ответ /api/users) */
export type ClientSearchListRow = {
	id: number;
	first_name?: string | null;
	last_name?: string | null;
	middle_name?: string | null;
	phone: string;
	status?: string | null;
};

export function clientFullName(row: Pick<ClientSearchListRow, "first_name" | "last_name" | "middle_name">): string {
	const name = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(" ").trim();
	return name || "Без имени";
}

export function clientPhoneLine(phone: string): string {
	return formatPhoneDisplay(phone) || phone;
}

export function clientStatusLabelRu(status: string | null | undefined): string {
	const labels: Record<string, string> = {
		verified: "Подтверждён",
		unverified: "Не подтверждён",
	};
	if (!status) return "—";
	return labels[status] || status;
}

export function clientStatusToneKey(status: string | null | undefined): string {
	if (status === "verified") return "toneVerified";
	if (status === "unverified") return "toneUnverified";
	return "toneDefault";
}
