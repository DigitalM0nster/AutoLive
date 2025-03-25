import { NextResponse } from "next/server";
import { getDatabaseConnection } from "@/lib/db";

export async function GET() {
	try {
		const db = await getDatabaseConnection();
		const [categories] = await db.execute("SELECT id, name, image_url FROM categories");
		await db.end();

		return NextResponse.json(categories);
	} catch (error) {
		console.error("Ошибка загрузки категорий:", error);
		return NextResponse.json({ error: "Ошибка загрузки категорий" }, { status: 500 });
	}
}
