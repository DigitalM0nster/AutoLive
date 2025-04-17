import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function POST(req: Request) {
	const { ids } = await req.json();

	if (!Array.isArray(ids) || ids.length === 0) {
		return new Response("No IDs provided", { status: 400 });
	}

	const products = await prisma.product.findMany({
		where: {
			id: { in: ids.map((id) => Number(id)) },
		},
	});

	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("Товары");

	worksheet.columns = [
		{ header: "ID", key: "id", width: 10 },
		{ header: "Название", key: "title", width: 30 },
		{ header: "Артикул", key: "sku", width: 20 },
		{ header: "Бренд", key: "brand", width: 20 },
		{ header: "Цена", key: "price", width: 15 },
		{ header: "Описание", key: "description", width: 50 },
	];

	products.forEach((product) => {
		worksheet.addRow({
			id: product.id,
			title: product.title,
			sku: product.sku,
			brand: product.brand,
			price: product.price,
			description: product.description || "",
		});
	});

	const buffer = await workbook.xlsx.writeBuffer();

	return new Response(buffer, {
		headers: {
			"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"Content-Disposition": 'attachment; filename="products.xlsx"',
		},
	});
}
