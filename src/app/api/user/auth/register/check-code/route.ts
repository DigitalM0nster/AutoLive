import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
	try {
		const { phone } = await request.json();
		if (!phone) {
			return NextResponse.json({ error: "Введите телефон" }, { status: 400 });
		}

		// Ищем актуальный неиспользованный код
		const code = await prisma.smsCode.findFirst({
			where: {
				phone,
				expiresAt: { gt: new Date() },
				used: false,
			},
			orderBy: { expiresAt: "desc" },
		});

		if (code) {
			const expiresIn = Math.max(0, Math.floor((code.expiresAt.getTime() - Date.now()) / 1000));
			return NextResponse.json({
				success: true,
				message: "Код ещё активен",
				expires_in: expiresIn,
			});
		} else {
			return NextResponse.json({
				success: false,
				message: "Код истёк",
				expires_in: 0,
			});
		}
	} catch (error) {
		console.error("Ошибка проверки кода:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
