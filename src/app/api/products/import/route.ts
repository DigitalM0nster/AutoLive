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

		for (const row of rows.slice(1)) {
			const sku = row[columns.sku]?.toString().trim();
			const title = row[columns.title]?.toString().trim();
			const priceRaw = row[columns.price];
			const brand = row[columns.brand]?.toString().trim();

			let categoryTitle = null;
			if (columns.category !== -1) {
				categoryTitle = row[columns.category]?.toString().trim();
			}

			if (!sku || !title || !priceRaw || !brand) continue;

			const price = typeof priceRaw === "string" ? parseFloat(priceRaw.replace(",", ".")) : priceRaw;

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
						description: null,
						categoryId: category?.id || null,
					},
				});
				created++;
			}
		}

		// ✅ Записываем лог
		await prisma.importLog.create({
			data: {
				userId: 1, // заменить позже на ID текущего пользователя
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
