import { NextResponse } from "next/server";
import { getDatabaseConnection } from "@/lib/db";

export async function POST(request) {
	try {
		const { phone } = await request.json();
		if (!phone) return NextResponse.json({ error: "Введите телефон" }, { status: 400 });

		const db = await getDatabaseConnection();

		// Проверяем, есть ли ещё действующий код (ищем только по номеру телефона)
		const [rows] = await db.execute("SELECT expires_at FROM sms_codes WHERE phone = ? AND expires_at > NOW()", [phone]);

		await db.end();

		if (rows.length > 0) {
			const expiresAt = new Date(rows[0].expires_at);
			const now = new Date();
			const expiresIn = Math.max(0, Math.floor((expiresAt - now) / 1000)); // Оставшееся время в секундах

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
