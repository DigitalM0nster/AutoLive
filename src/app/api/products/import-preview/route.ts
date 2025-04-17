// src\app\api\products\import-preview\route.ts

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { withPermission } from "@/middleware/permissionMiddleware";
import { OBJECTS_PER_PAGE } from "@/lib/objectsPerPage";

export const POST = withPermission(
	async (req, { user }) => {
		try {
			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1");

			const formData = await req.formData();
			const file = formData.get("file") as File;

			if (!file) {
				return NextResponse.json({ error: "Файл не получен" }, { status: 400 });
			}

			// Читаем Excel-файл через exceljs
			const arrayBuffer = await file.arrayBuffer();
			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.load(arrayBuffer);

			// Берём первый лист
			const worksheet = workbook.worksheets[0];
			const rows: any[][] = [];
			worksheet.eachRow({ includeEmpty: true }, (row) => {
				// row.values[0] всегда undefined, поэтому slice(1)
				rows.push((row.values as any[]).slice(1));
			});

			// Фильтрация непустых строк
			const nonEmptyRows = rows.filter((row) => row.some((cell) => cell !== ""));

			// Пагинация
			const start = (page - 1) * OBJECTS_PER_PAGE;
			const end = page * OBJECTS_PER_PAGE;
			const pageRows = nonEmptyRows.slice(start, end);

			return NextResponse.json({
				rows: pageRows,
				total: nonEmptyRows.length,
				page,
			});
		} catch (error) {
			console.error("Ошибка при парсинге файла:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);
