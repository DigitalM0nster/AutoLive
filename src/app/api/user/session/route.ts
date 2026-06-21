import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { Role, ROLE_PERMISSIONS, RolePermission } from "@/lib/rolesConfig";

type DecodedToken = {
	id: number;
	role: Role;
	name?: string;
	phone: string;
	status?: "verified" | "unverified";
	departmentId?: number;
};

/**
 * Проверка сессии без 401 в консоли браузера.
 * Гость → 200 { authenticated: false }
 * Авторизован → 200 { authenticated: true, user: {...} }
 */
export async function GET() {
	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value;

	if (!token) {
		return NextResponse.json({ authenticated: false });
	}

	if (!process.env.JWT_SECRET) {
		return NextResponse.json({ authenticated: false });
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;

		if (["superadmin", "admin", "manager"].includes(decoded.role)) {
			const admin = await prisma.user.findUnique({
				where: { id: decoded.id },
				select: {
					id: true,
					first_name: true,
					last_name: true,
					middle_name: true,
					phone: true,
					role: true,
					departmentId: true,
					department: {
						select: { id: true, name: true },
					},
				},
			});

			if (!admin) {
				return NextResponse.json({ authenticated: false });
			}

			const permissions = (ROLE_PERMISSIONS[admin.role] || []).map((p) => p.permission);

			return NextResponse.json({
				authenticated: true,
				user: { ...admin, permissions },
			});
		}

		if (decoded.role === "client") {
			const dbUser = await prisma.user.findUnique({
				where: { id: decoded.id },
				select: {
					first_name: true,
					last_name: true,
					middle_name: true,
				},
			});

			const permissions: RolePermission[] = ROLE_PERMISSIONS[decoded.role] || [];

			return NextResponse.json({
				authenticated: true,
				user: {
					id: decoded.id,
					phone: decoded.phone,
					role: decoded.role,
					status: decoded.status,
					first_name: dbUser?.first_name ?? "",
					last_name: dbUser?.last_name ?? "",
					middle_name: dbUser?.middle_name ?? "",
					permissions,
				},
			});
		}

		return NextResponse.json({ authenticated: false });
	} catch {
		return NextResponse.json({ authenticated: false });
	}
}
