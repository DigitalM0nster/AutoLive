// src\app\api\products\import\route.ts

import { NextResponse } from "next/server";
import { read, utils } from "xlsx";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
	try {
		const formData = await req.formData();
		const file = formData.get("file") as File;
		const columns = JSON.parse(formData.get("columns") as string);

		if (!file) {
			return NextResponse.json({ error: "Файл не получен" }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const workbook = read(buffer, { type: "buffer" });
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[][];

		let created = 0;
		let updated = 0;

		for (const [i, row] of rows.slice(1).entries()) {
			try {
				if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) continue;

				const sku = row[columns.sku]?.toString().trim();
				const title = row[columns.title]?.toString().trim();
				const priceRaw = row[columns.price];
				const brand = row[columns.brand]?.toString().trim();

				if (!sku || !title || !priceRaw || !brand) continue;

				const price = typeof priceRaw === "string" ? parseFloat(priceRaw.replace(",", ".")) : priceRaw;

				const categoryIndex = columns.category;
				const descriptionIndex = columns.description;

				const categoryTitle = categoryIndex !== undefined && categoryIndex !== -1 ? row[categoryIndex]?.toString().trim() : null;
				const description = descriptionIndex !== undefined && descriptionIndex !== -1 ? row[descriptionIndex]?.toString().trim() : null;

				let category = null;
				if (categoryTitle) {
					category = await prisma.category.upsert({
						where: { title: categoryTitle },
						update: {},
						create: { title: categoryTitle },
					});
				}

				const existing = await prisma.product.findFirst({
					where: { sku, brand },
				});

				if (existing) {
					await prisma.product.update({
						where: { id: existing.id },
						data: {
							title,
							price,
							categoryId: category?.id || null,
							description: description || null,
						},
					});
					updated++;
				} else {
					await prisma.product.create({
						data: {
							sku,
							title,
							brand,
							price,
							image: null,
							description: description || null,
							categoryId: category?.id || null,
						},
					});
					created++;
				}
			} catch (err) {
				console.warn(`⚠️ Ошибка при импорте строки ${i + 2}:`, err);
				continue;
			}
		}

		await prisma.importLog.create({
			data: {
				userId: 1,
				fileName: file.name,
				created,
				updated,
			},
		});

		return NextResponse.json({ created, updated });
	} catch (error) {
		console.error("Ошибка при импорте товаров:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
