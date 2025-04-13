import { NextResponse } from "next/server";
import { read, utils } from "xlsx";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { Permission } from "@/lib/rolesConfig";

// Настройки обработки: размер чанка и параллельность
const CHUNK_SIZE = 1000;
const CONCURRENCY_LIMIT = 50;

// Ограничитель числа одновременных операций
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

// Главный обработчик импорта
export const POST = withPermission(
	async (req, { user }) => {
		try {
			const unauthorizedCategories = new Set<string>();

			// Получаем form-data: файл и описание колонок
			const formData = await req.formData();
			const file = formData.get("file") as File;
			const columns = JSON.parse(formData.get("columns") as string);

			if (!file) {
				return NextResponse.json({ error: "Файл не получен" }, { status: 400 });
			}

			// Читаем Excel-файл
			const buffer = Buffer.from(await file.arrayBuffer());
			const workbook = read(buffer, { type: "buffer" });
			const sheet = workbook.Sheets[workbook.SheetNames[0]];
			const rows = utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

			// Статистика импорта
			let created = 0;
			let updated = 0;
			let skipped = 0;

			// Кэш категорий, чтобы не делать запрос каждый раз
			const categoryCache: Record<string, number | null> = {};

			// Функция получения ID категории, если она существует
			const getCategoryId = async (categoryTitle: string): Promise<number | null> => {
				if (!categoryTitle) return null;
				if (categoryCache.hasOwnProperty(categoryTitle)) return categoryCache[categoryTitle];

				const category = await prisma.category.findFirst({
					where: { title: categoryTitle },
					select: { id: true },
				});

				if (category) {
					categoryCache[categoryTitle] = category.id;
					return category.id;
				}

				// 👇 Пытаемся создать категорию только если пользователь — суперадмин
				if (user.role === "superadmin") {
					const created = await prisma.category.create({
						data: { title: categoryTitle },
					});
					categoryCache[categoryTitle] = created.id;
					return created.id;
				} else {
					unauthorizedCategories.add(categoryTitle);
					categoryCache[categoryTitle] = null;
					return null;
				}
			};

			// Функция обработки одной строки (одного товара)
			const processRow = async (row: any[]): Promise<{ created?: true; updated?: true; skipped?: true }> => {
				try {
					if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) {
						return { skipped: true };
					}

					// Извлекаем данные из нужных колонок
					const sku = row[columns.sku]?.toString().trim();
					const title = row[columns.title]?.toString().trim();
					const brand = row[columns.brand]?.toString().trim();
					const priceRaw = row[columns.price];

					if (!sku || !title || !priceRaw || !brand) {
						return { skipped: true };
					}

					const price = typeof priceRaw === "string" ? parseFloat(priceRaw.replace(",", ".")) : priceRaw;

					const categoryTitle = columns.category !== undefined && columns.category !== -1 ? row[columns.category]?.toString().trim() : null;
					const description = columns.description !== undefined && columns.description !== -1 ? row[columns.description]?.toString().trim() : null;

					const categoryId = categoryTitle ? await getCategoryId(categoryTitle) : null;

					// Если категории нет — пропускаем товар
					if (categoryTitle && !categoryId) {
						console.warn(`Пропущен товар "${title}" — категория "${categoryTitle}" не найдена`);
						return { skipped: true };
					}

					// Проверяем, существует ли товар с таким SKU и брендом
					const existing = await prisma.product.findFirst({
						where: { sku, brand },
					});

					if (existing) {
						// Обновляем товар
						await prisma.product.update({
							where: { id: existing.id },
							data: {
								title,
								price,
								categoryId,
								description: description || null,
							},
						});
						return { updated: true };
					} else {
						// Создаём новый товар
						await prisma.product.create({
							data: {
								sku,
								title,
								brand,
								price,
								image: null,
								description: description || null,
								categoryId,
								departmentId: user.departmentId ?? null, // 👈 важно, если у товаров есть отдел
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
				const results = await asyncPool(CONCURRENCY_LIMIT, chunk, async (row) => processRow(row));

				results.forEach((result) => {
					if (result.created) created++;
					if (result.updated) updated++;
					if (result.skipped) skipped++;
				});

				console.log(`Обработан чанк строк с ${i + 1} по ${i + chunk.length}`);
			}

			// Сохраняем лог импорта
			await prisma.importLog.create({
				data: {
					userId: user.id,
					fileName: file.name,
					created,
					updated,
					message: unauthorizedCategories.size > 0 ? `Не удалось создать категории: ${[...unauthorizedCategories].join(", ")}` : null,
				},
			});

			// Возвращаем результат
			return NextResponse.json({
				created,
				updated,
				skipped,
				missingCategories: [...unauthorizedCategories],
			});
		} catch (error) {
			console.error("Ошибка при импорте товаров:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["superadmin", "admin"]
);
