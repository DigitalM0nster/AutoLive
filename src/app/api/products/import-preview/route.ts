import { NextResponse } from "next/server";
import { read, utils } from "xlsx";

export async function POST(req: Request) {
	try {
		const formData = await req.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json({ error: "Файл не получен" }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const workbook = read(buffer, { type: "buffer" });
		const sheet = workbook.Sheets[workbook.SheetNames[0]];

		// Получаем все строки без ограничения
		const rows = utils.sheet_to_json(sheet, { header: 0, defval: "" }) as any[][];

		// Преобразуем объекты в массивы
		const formattedRows = rows.map((row) => Object.values(row));

		// Просто вернем все строки, без ограничения
		return NextResponse.json({ rows: formattedRows });
	} catch (error) {
		console.error("Ошибка при парсинге файла:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
