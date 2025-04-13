// src/app/api/products/preview/route.ts

import { NextResponse } from "next/server";
import { read, utils } from "xlsx";
import { withPermission } from "@/middleware/permissionMiddleware";

// 👇 Только админы и суперадмины могут использовать предпросмотр
export const POST = withPermission(
	async (req, { user }) => {
		try {
			const formData = await req.formData();
			const file = formData.get("file") as File;

			if (!file) {
				return NextResponse.json({ error: "Файл не получен" }, { status: 400 });
			}

			const buffer = Buffer.from(await file.arrayBuffer());
			const workbook = read(buffer, { type: "buffer" });
			const sheet = workbook.Sheets[workbook.SheetNames[0]];

			const rows = utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

			// Убираем полностью пустые строки
			const nonEmptyRows = rows.filter((row) => row.some((cell) => cell !== ""));

			return NextResponse.json({ rows: nonEmptyRows });
		} catch (error) {
			console.error("Ошибка при парсинге файла:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);
