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
	const token = cookieStore.get("authToken")?.value; // 👈 заменили

	if (!token) {
		redirect("/admin");
	}

	let user: DecodedToken | null = null;

	try {
		user = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
	} catch (e) {
		return <div className="p-4 text-center text-red-500">Ошибка авторизации. Попробуйте зайти снова.</div>;
	}

	if (!["superadmin", "admin", "manager"].includes(user.role)) {
		return <div className="p-4 text-center text-red-500">У вас нет доступа к админке</div>;
	}

	return <AdminDashboard user={user} />;
}
