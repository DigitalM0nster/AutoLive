// src/app/admin/page.tsx
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { Role } from "@/lib/rolesConfig";
import AdminLoginForm from "./AdminLoginForm";

type DecodedToken = {
	id: number;
	role: Role;
	name: string;
	phone: string;
	iat: number;
	exp: number;
};

export default async function AdminLoginPage() {
	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value;

	let user: DecodedToken | null = null;

	if (token) {
		try {
			user = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
		} catch {
			// invalid token — не редиректим
		}
	}

	if (user && ["superadmin", "admin", "manager"].includes(user.role)) {
		redirect("/admin/dashboard");
	}

	return <AdminLoginForm />;
}
