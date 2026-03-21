import type { ReactNode } from "react";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import { Role } from "@/lib/rolesConfig";

/**
 * Раздел «Контент сайта» — только суперадмин.
 * POST API для контента уже проверяют роль; здесь закрываем UI от admin/manager.
 */
type DecodedToken = {
	id: number;
	role: Role;
	iat: number;
	exp: number;
};

export default async function AdminContentLayout({ children }: { children: ReactNode }) {
	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value;

	if (!token) {
		redirect("/admin");
	}

	let user: DecodedToken;
	try {
		user = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
	} catch {
		redirect("/admin");
	}

	if (!["superadmin", "admin", "manager"].includes(user.role)) {
		redirect("/admin");
	}

	if (user.role !== "superadmin") {
		redirect("/admin/dashboard");
	}

	return <>{children}</>;
}
