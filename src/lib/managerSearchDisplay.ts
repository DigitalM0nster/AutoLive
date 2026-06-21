import { formatPhoneDisplay } from "@/lib/phoneUtils";

/** Строка сотрудника в результатах поиска ответственного */
export type ManagerSearchListRow = {
	id: number;
	first_name?: string | null;
	last_name?: string | null;
	middle_name?: string | null;
	phone: string;
	role: string;
	department?: { id: number; name: string | null } | null;
	departmentId?: number | null;
};

export function managerFullName(row: Pick<ManagerSearchListRow, "first_name" | "last_name" | "middle_name">): string {
	const name = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(" ").trim();
	return name || "Без имени";
}

export function managerPhoneLine(phone: string): string {
	return formatPhoneDisplay(phone) || phone;
}

export function managerRoleLabelRu(role: string | null | undefined): string {
	const labels: Record<string, string> = {
		superadmin: "Суперадмин",
		admin: "Администратор",
		manager: "Менеджер",
	};
	if (!role) return "—";
	return labels[role] || role;
}

export function managerRoleToneKey(role: string | null | undefined): string {
	if (role === "superadmin") return "toneSuperadmin";
	if (role === "admin") return "toneAdmin";
	if (role === "manager") return "toneManager";
	return "toneDefault";
}

export function managerDepartmentLine(row: ManagerSearchListRow): string {
	return row.department?.name?.trim() || "Без отдела";
}
