import { NextResponse } from "next/server";
import { read, utils } from "xlsx";
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

			const buffer = Buffer.from(await file.arrayBuffer());
			const workbook = read(buffer, { type: "buffer" });
			const sheet = workbook.Sheets[workbook.SheetNames[0]];

			const rows = utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

			const nonEmptyRows = rows.filter((row) => row.some((cell) => cell !== ""));

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
