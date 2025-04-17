import { NextResponse } from "next/server";
// Заменили xlsx → exceljs
import ExcelJS from "exceljs";
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
			const rawMarkupRules = JSON.parse(formData.get("markupRules") as string) as {
				from: number | null;
				to: number | null;
				type: "%" | "₽";
				value: number | null;
			}[];

			const markupRules = rawMarkupRules
				.filter((r) => {
					// отсекаем невалидные или пустые
					if (r.value === null || isNaN(r.value)) return false;
					const from = r.from ?? 0;
					const to = r.to ?? Infinity;
					if (from > to) return false;
					return true;
				})
				.map((r) => ({
					from: r.from ?? 0,
					to: r.to ?? Infinity,
					type: r.type,
					value: r.value!,
				}));

			function applyMarkup(supplierPrice: number, rules: typeof markupRules, fallback: { type: "%" | "₽"; value: number }): number {
				for (const rule of rules) {
					if (supplierPrice >= rule.from && supplierPrice <= rule.to) {
						return rule.type === "%" ? Math.round(supplierPrice * (1 + rule.value / 100)) : Math.round(supplierPrice + rule.value);
					}
				}
				return fallback.type === "%" ? Math.round(supplierPrice * (1 + fallback.value / 100)) : Math.round(supplierPrice + fallback.value);
			}

			const defaultMarkup = JSON.parse(formData.get("defaultMarkup") as string) as {
				type: "%" | "₽";
				value: number;
			};

			if (!file) {
				return NextResponse.json({ error: "Файл не получен" }, { status: 400 });
			}

			// Читаем Excel-файл через exceljs
			const arrayBuffer = await file.arrayBuffer();
			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.load(arrayBuffer);

			const worksheet = workbook.worksheets[0];
			const rows: any[][] = [];
			worksheet.eachRow({ includeEmpty: true }, (row) => {
				rows.push((row.values as any[]).slice(1));
			});

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

				// 👇 Создаём категорию только для суперадмина
				if (user.role === "superadmin") {
					const createdCat = await prisma.category.create({
						data: { title: categoryTitle },
					});
					categoryCache[categoryTitle] = createdCat.id;
					return createdCat.id;
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

					const sku = row[columns.sku]?.toString().trim();
					const title = row[columns.title]?.toString().trim();
					const brand = row[columns.brand]?.toString().trim();
					const priceRaw = row[columns.price];

					if (!sku || !title || !priceRaw || !brand) {
						return { skipped: true };
					}

					const supplierPrice = typeof priceRaw === "string" ? parseFloat(priceRaw.replace(",", ".")) : priceRaw;
					if (!supplierPrice || isNaN(supplierPrice)) return { skipped: true };

					const price = applyMarkup(supplierPrice, markupRules, defaultMarkup);

					const categoryTitle = columns.category !== undefined && columns.category !== -1 ? row[columns.category]?.toString().trim() : null;
					const description = columns.description !== undefined && columns.description !== -1 ? row[columns.description]?.toString().trim() : null;

					const categoryId = categoryTitle ? await getCategoryId(categoryTitle) : null;

					// Если категории нет — пропускаем товар
					if (categoryTitle && !categoryId) {
						console.warn(`Пропущен товар "${title}" — категория "${categoryTitle}" не найдена`);
						return { skipped: true };
					}

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
								supplierPrice,
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
								supplierPrice,
								image: null,
								description: description || null,
								categoryId,
								departmentId: user.departmentId ?? null,
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
