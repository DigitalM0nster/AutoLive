import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export function authMiddleware(allowedRoles) {
	return async (req) => {
		try {
			const authHeader = req.headers.get("Authorization");
			if (!authHeader) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });

			const token = authHeader.split(" ")[1];
			const decoded = jwt.verify(token, process.env.JWT_SECRET);

			if (!allowedRoles.includes(decoded.role)) {
				return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
			}

			req.user = decoded;
			return NextResponse.next();
		} catch (error) {
			return NextResponse.json({ error: "Неверный токен" }, { status: 401 });
		}
	};
}
