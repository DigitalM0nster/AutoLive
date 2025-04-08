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
		const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[][];

		return NextResponse.json({ rows: rows.slice(0, 20) });
	} catch (error) {
		console.error("Ошибка при парсинге файла:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
