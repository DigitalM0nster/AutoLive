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

		// Чтение файла как массив массивов
		const rows = utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

		// Фильтруем пустые строки (без одной хотя бы непустой ячейки)
		const nonEmptyRows = rows.filter((row) => row.some((cell) => cell !== ""));

		// Отправляем только непустые строки
		return NextResponse.json({ rows: nonEmptyRows });
	} catch (error) {
		console.error("Ошибка при парсинге файла:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
