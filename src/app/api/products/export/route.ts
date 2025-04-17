// src\app\api\products\export\route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { withPermission } from "@/middleware/permissionMiddleware";

export const POST = withPermission(
	async (req: NextRequest, { user, scope }) => {
		const { ids } = await req.json();

		if (!Array.isArray(ids) || ids.length === 0) {
			return NextResponse.json({ message: "No IDs provided" }, { status: 400 });
		}

		const numericIds = ids.map((id) => parseInt(id)).filter((id) => !isNaN(id));
		if (numericIds.length === 0) {
			return NextResponse.json({ message: "Некорректные ID" }, { status: 400 });
		}

		// Проверка доступа к товарам
		if (scope === "department") {
			const invalidProducts = await prisma.product.findMany({
				where: {
					id: { in: numericIds },
					departmentId: { not: user.departmentId },
				},
			});

			if (invalidProducts.length > 0) {
				return NextResponse.json({ message: "Некоторые товары не принадлежат вашему отделу" }, { status: 403 });
			}
		}

		const products = await prisma.product.findMany({
			where: { id: { in: numericIds } },
		});

		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet("Товары");

		worksheet.columns = [
			{ header: "ID", key: "id", width: 10 },
			{ header: "Название", key: "title", width: 30 },
			{ header: "Артикул", key: "sku", width: 20 },
			{ header: "Бренд", key: "brand", width: 20 },
			{ header: "Стоимость у поставщика", key: "supplierPrice", width: 15 },
			{ header: "Цена", key: "price", width: 15 },
			{ header: "Описание", key: "description", width: 50 },
		];

		products.forEach((product) => {
			worksheet.addRow({
				id: product.id,
				title: product.title,
				sku: product.sku,
				brand: product.brand,
				supplierPrice: product.supplierPrice,
				price: product.price,
				description: product.description || "",
			});
		});

		const buffer = await workbook.xlsx.writeBuffer();

		return new NextResponse(buffer, {
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": 'attachment; filename="products.xlsx"',
			},
		});
	},
	"view_products",
	["superadmin", "admin", "manager"]
);
