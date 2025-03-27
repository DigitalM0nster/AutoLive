// src\app\admin\dashboard\page.tsx

"use server";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import { Role } from "@/lib/rolesConfig";
import AdminDashboard from "./AdminDashboard";

type DecodedToken = {
	id: number;
	role: Role;
	name: string;
	phone: string;
	iat: number;
	exp: number;
};

export default async function DashboardPage() {
	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value;

	if (!token) {
		redirect("/admin");
	}

	let user: DecodedToken | null = null;

	try {
		user = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
	} catch {
		redirect("/admin");
	}

	if (!["superadmin", "admin", "manager"].includes(user.role)) {
		redirect("/admin");
	}

	// ✅ Всё хорошо — отдаем клиентскую часть
	return <AdminDashboard user={user} />;
}
