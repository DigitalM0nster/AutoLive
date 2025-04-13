import { NextResponse } from "next/server";
import { read, utils } from "xlsx";
import { prisma } from "@/lib/prisma";

const CHUNK_SIZE = 1000; // Размер чанка (кол-во строк)
const CONCURRENCY_LIMIT = 50; // Максимальное число одновременных операций

// Реализация собственной функции asyncPool для ограничения одновременных запросов
async function asyncPool<T, R>(poolLimit: number, array: T[], iteratorFn: (item: T, index: number) => Promise<R>): Promise<R[]> {
	const ret: Promise<R>[] = [];
	const executing: Promise<void>[] = [];

	for (let i = 0; i < array.length; i++) {
		const item = array[i];
		const p = Promise.resolve().then(() => iteratorFn(item, i));
		ret.push(p);

		if (poolLimit <= array.length) {
			const e = p.then(() => {
				executing.splice(executing.indexOf(e), 1);
			});
			executing.push(e);
			if (executing.length >= poolLimit) {
				await Promise.race(executing);
			}
		}
	}
	return Promise.all(ret);
}

export async function POST(req: Request) {
	try {
		const formData = await req.formData();
		const file = formData.get("file") as File;
		const columns = JSON.parse(formData.get("columns") as string);

		if (!file) {
			return NextResponse.json({ error: "Файл не получен" }, { status: 400 });
		}

		// Чтение файла и преобразование в массив массивов (header: 1)
		const buffer = Buffer.from(await file.arrayBuffer());
		const workbook = read(buffer, { type: "buffer" });
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const rows = utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

		// Инициализация счётчиков
		let created = 0;
		let updated = 0;
		let skipped = 0;

		// Кэш категорий для предотвращения повторного upsert для одного и того же названия категории
		const categoryCache: Record<string, number> = {};

		const getCategoryId = async (categoryTitle: string): Promise<number | null> => {
			if (!categoryTitle) return null;
			if (categoryCache[categoryTitle]) return categoryCache[categoryTitle];

			const category = await prisma.category.upsert({
				where: { title: categoryTitle },
				update: {},
				create: { title: categoryTitle },
			});
			categoryCache[categoryTitle] = category.id;
			return category.id;
		};

		// Функция обработки одной строки
		const processRow = async (row: any[]): Promise<{ created?: true; updated?: true; skipped?: true }> => {
			try {
				// Если строка пустая, пропускаем её
				if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) {
					return { skipped: true };
				}

				const sku = row[columns.sku]?.toString().trim();
				const title = row[columns.title]?.toString().trim();
				const brand = row[columns.brand]?.toString().trim();
				const priceRaw = row[columns.price];

				// Обязательные поля (sku, title, price, brand)
				if (!sku || !title || !priceRaw || !brand) {
					return { skipped: true };
				}

				const price = typeof priceRaw === "string" ? parseFloat(priceRaw.replace(",", ".")) : priceRaw;

				const categoryTitle = columns.category !== undefined && columns.category !== -1 ? row[columns.category]?.toString().trim() : null;
				const description = columns.description !== undefined && columns.description !== -1 ? row[columns.description]?.toString().trim() : null;

				const categoryId = categoryTitle ? await getCategoryId(categoryTitle) : null;

				// Поиск существующего продукта по уникальным ключам sku и brand
				const existing = await prisma.product.findFirst({
					where: { sku, brand },
				});

				if (existing) {
					await prisma.product.update({
						where: { id: existing.id },
						data: {
							title,
							price,
							categoryId: categoryId || null,
							description: description || null,
						},
					});
					return { updated: true };
				} else {
					await prisma.product.create({
						data: {
							sku,
							title,
							brand,
							price,
							image: null, // Можно задать значение по умолчанию для изображения
							description: description || null,
							categoryId: categoryId || null,
						},
					});
					return { created: true };
				}
			} catch (err) {
				console.warn("Ошибка при обработке строки:", err);
				return { skipped: true };
			}
		};

		// Обрабатываем строки чанками
		const totalRows = rows.length;
		console.log(`Всего строк в файле: ${totalRows}`);

		for (let i = 1; i < totalRows; i += CHUNK_SIZE) {
			const chunk = rows.slice(i, i + CHUNK_SIZE);

			// Используем нашу asyncPool вместо p-limit для ограничения параллелизма
			const results = await asyncPool(CONCURRENCY_LIMIT, chunk, async (row) => processRow(row));

			results.forEach((result) => {
				if (result.created) created++;
				if (result.updated) updated++;
				if (result.skipped) skipped++;
			});

			console.log(`Обработан чанк строк с ${i + 1} по ${i + chunk.length}`);
		}

		// Логирование импорта
		await prisma.importLog.create({
			data: {
				userId: 1, // Замените на актуальное значение идентификатора пользователя
				fileName: file.name,
				created,
				updated,
			},
		});

		return NextResponse.json({ created, updated, skipped });
	} catch (error) {
		console.error("Ошибка при импорте товаров:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}
