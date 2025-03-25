import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		const { date, time, service, name, phone, comment } = body;

		if (!date || !time || !service || !name || !phone) {
			return NextResponse.json({ error: "Не все поля заполнены" }, { status: 400 });
		}

		// 🔥 Здесь можно добавить сохранение в БД или отправку уведомления

		console.log("📥 Новая заявка на ТО:", body);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("❌ Ошибка сервера:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
