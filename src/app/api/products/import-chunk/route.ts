// src\app\api\products\import-chunk\route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";

export const POST = withPermission(
	async (req, { user }) => {
		try {
			const { rows, columns, markupRules, defaultMarkup, preserveImages, departmentId: rawDepartmentId, chunkIndex, totalChunks } = await req.json();

			const departmentId = user.role === "superadmin" ? rawDepartmentId : user.departmentId ?? null;
			if (!departmentId) {
				return NextResponse.json({ error: "Отдел не указан" }, { status: 400 });
			}

			function applyMarkup(price: number, rules: typeof markupRules, fallback: typeof defaultMarkup): number {
				for (const rule of rules) {
					if (rule.value !== null && !isNaN(rule.value) && price >= (rule.from ?? 0) && price <= (rule.to ?? Infinity)) {
						return rule.type === "%" ? Math.round(price * (1 + rule.value / 100)) : Math.round(price + rule.value);
					}
				}
				return fallback.type === "%" ? Math.round(price * (1 + fallback.value / 100)) : Math.round(price + fallback.value);
			}

			const allCategories = await prisma.category.findMany({ select: { id: true, title: true } });
			const categoryMap = new Map(allCategories.map((c) => [c.title.trim(), c.id]));

			const allowedCategoryLinks = await prisma.departmentCategory.findMany({
				where: { departmentId },
				select: { categoryId: true },
			});
			const allowedCategoryIds = new Set(allowedCategoryLinks.map((link) => link.categoryId));

			const existing = await prisma.product.findMany({
				where: { departmentId },
				select: {
					id: true,
					sku: true,
					brand: true,
					image: true,
					title: true,
					price: true,
					supplierPrice: true,
					description: true,
					categoryId: true,
				},
			});
			const existingMap = new Map<string, (typeof existing)[number]>();
			for (const p of existing) {
				existingMap.set(`${p.sku.toLowerCase()}||${p.brand.toLowerCase()}`, p);
			}

			const lastByKey = new Map<string, number>();
			const localDuplicates = new Set<string>();
			for (let i = 0; i < rows.length; i++) {
				const sku = rows[i][columns.sku]?.toString().trim()?.toLowerCase();
				const brand = rows[i][columns.brand]?.toString().trim()?.toLowerCase();
				if (!sku || !brand) continue;
				const key = `${sku}||${brand}`;
				if (lastByKey.has(key)) localDuplicates.add(key);
				lastByKey.set(key, i);
			}

			const toCreate: any[] = [];
			const toUpdate: { id: number; data: any }[] = [];
			const logsToCreate: any[] = [];

			let skipped = 0;
			let removedCategoriesCount = 0;
			const unknownCategoryTitles = new Set<string>();

			const beforeMap = new Map<number, any>();
			const afterMap = new Map<number, any>();

			const skippedSnapshots: {
				sku: string;
				brand: string;
				title?: string;
				price: number;
				status: "skipped";
				reason: string;
			}[] = [];

			for (let i = 0; i < rows.length; i++) {
				const row = rows[i];
				const sku = row[columns.sku]?.toString().trim();
				const title = row[columns.title]?.toString().trim();
				const brand = row[columns.brand]?.toString().trim();
				const priceRaw = row[columns.price];

				if (!sku || !title || !brand || !priceRaw) {
					skipped++;
					skippedSnapshots.push({
						sku: sku ?? "—",
						brand: brand ?? "—",
						title: title ?? "—",
						price: 0,
						status: "skipped",
						reason: "Не заполнены обязательные поля",
					});
					continue;
				}

				const key = `${sku.toLowerCase()}||${brand.toLowerCase()}`;
				if (lastByKey.get(key) !== i) {
					skipped++;
					skippedSnapshots.push({
						sku,
						brand,
						title,
						price: 0,
						status: "skipped",
						reason: "Локальный дубликат",
					});
					continue;
				}

				const supplierPrice = typeof priceRaw === "string" ? parseFloat(priceRaw.replace(",", ".")) : priceRaw;
				if (!supplierPrice || isNaN(supplierPrice)) {
					skipped++;
					skippedSnapshots.push({
						sku,
						brand,
						title,
						price: 0,
						status: "skipped",
						reason: "Неверная цена",
					});
					continue;
				}

				const price = applyMarkup(supplierPrice, markupRules, defaultMarkup);
				const description = columns.description !== -1 ? row[columns.description]?.toString().trim() : null;
				const image = columns.image !== -1 ? row[columns.image]?.toString().trim() || null : null;
				const categoryTitle = columns.category !== -1 ? row[columns.category]?.toString().trim() : null;

				let categoryId: number | null = null;
				if (categoryTitle) {
					const matchedCategoryId = categoryMap.get(categoryTitle) ?? null;
					if (matchedCategoryId !== null && allowedCategoryIds.has(matchedCategoryId)) {
						categoryId = matchedCategoryId;
					} else {
						categoryId = null;
						removedCategoriesCount++;
						unknownCategoryTitles.add(categoryTitle);
					}
				}

				const existingProduct = existingMap.get(key);

				if (existingProduct) {
					const updatedData = {
						title,
						price,
						supplierPrice,
						categoryId,
						description,
						image: image || (preserveImages ? existingProduct.image : null),
					};

					toUpdate.push({
						id: existingProduct.id,
						data: updatedData,
					});

					beforeMap.set(existingProduct.id, {
						id: existingProduct.id,
						sku,
						title: existingProduct.title,
						brand,
						price: existingProduct.price,
						supplierPrice: existingProduct.supplierPrice,
						description: existingProduct.description,
						image: existingProduct.image,
						categoryId: existingProduct.categoryId,
					});

					afterMap.set(existingProduct.id, {
						id: existingProduct.id,
						sku,
						title,
						brand,
						price,
						supplierPrice,
						description,
						image: image || (preserveImages ? existingProduct.image : null),
						categoryId,
					});
				} else {
					const newProduct = {
						sku,
						title,
						brand,
						price,
						supplierPrice,
						description,
						image,
						categoryId,
						departmentId,
					};

					toCreate.push(newProduct);

					logsToCreate.push({
						action: "create",
						userId: user.id,
						departmentId,
						message: `Импорт: создан товар ${sku} / ${brand}`,
						snapshotAfter: newProduct,
						productId: null,
					});
				}
			}

			// Создаем товары по одному, чтобы получить их ID
			if (toCreate.length > 0) {
				for (let i = 0; i < toCreate.length; i++) {
					const productData = toCreate[i];
					try {
						const createdProduct = await prisma.product.create({
							data: productData,
						});

						// Находим соответствующий лог и устанавливаем productId
						const correspondingLog = logsToCreate.find(
							(log) => log.action === "create" && log.snapshotAfter.sku === productData.sku && log.snapshotAfter.brand === productData.brand
						);

						if (correspondingLog) {
							correspondingLog.productId = createdProduct.id;
							// Обновляем snapshotAfter с ID товара
							correspondingLog.snapshotAfter.id = createdProduct.id;
						}
					} catch (error) {
						// Если товар уже существует (дубликат), пропускаем
						console.log(`Товар ${productData.sku} / ${productData.brand} уже существует, пропускаем`);
					}
				}
			}

			for (let i = 0; i < toUpdate.length; i += 100) {
				await Promise.all(
					toUpdate.slice(i, i + 100).map((item) =>
						prisma.product.update({
							where: { id: item.id },
							data: item.data,
						})
					)
				);
			}

			for (const item of toUpdate) {
				const before = beforeMap.get(item.id);
				const after = afterMap.get(item.id);

				if (!before || !after) continue;

				logsToCreate.push({
					action: "update",
					userId: user.id,
					productId: item.id,
					departmentId,
					message: `Импорт: обновлён товар ${before.sku} / ${before.brand}`,
					snapshotBefore: before,
					snapshotAfter: after,
				});
			}

			const userDepartment = await prisma.department.findUnique({
				where: { id: departmentId },
				select: { name: true },
			});
			const isFinalChunk = chunkIndex + 1 >= totalChunks;

			// Создаем лог импорта сначала, чтобы получить его ID
			let importLogId: number | null = null;
			if (isFinalChunk) {
				const snapshots = [
					...logsToCreate
						.filter((log) => log.action === "create" && log.productId)
						.map((log) => ({
							id: log.productId,
							sku: log.snapshotAfter.sku,
							brand: log.snapshotAfter.brand,
							title: log.snapshotAfter.title,
							price: log.snapshotAfter.price,
							supplierPrice: log.snapshotAfter.supplierPrice,
							image: log.snapshotAfter.image,
							department: { name: userDepartment?.name ?? "—" },
							category: log.snapshotAfter.categoryId ? { title: allCategories.find((c) => c.id === log.snapshotAfter.categoryId)?.title ?? "—" } : { title: "—" },
							status: "created",
						})),
					...toUpdate.map((u) => {
						const after = afterMap.get(u.id);
						return {
							id: u.id,
							sku: after?.sku ?? "—",
							brand: after?.brand ?? "—",
							title: after?.title ?? "—",
							price: after?.price ?? 0,
							supplierPrice: after?.supplierPrice ?? 0,
							image: after?.image ?? null,
							department: { name: userDepartment?.name ?? "—" },
							category: after?.categoryId ? { title: allCategories.find((c) => c.id === after.categoryId)?.title ?? "—" } : { title: "—" },
							status: "updated",
						};
					}),
					...skippedSnapshots.map((s) => ({
						id: null,
						sku: s.sku,
						brand: s.brand,
						title: s.title,
						price: s.price,
						department: { name: userDepartment?.name ?? "—" },
						category: { title: "—" },
						status: "skipped",
						reason: s.reason,
					})),
					// Добавляем записи для локальных дубликатов
					...Array.from(localDuplicates).map((key) => {
						const [sku, brand] = key.split("||");
						return {
							id: null,
							sku: sku,
							brand: brand,
							title: "—",
							price: 0,
							department: { name: userDepartment?.name ?? "—" },
							category: { title: "—" },
							status: "duplicate",
							reason: "Дубликат в импортируемом файле",
						};
					}),
				];

				console.log("🟡 Сохраняем importLog со snapshots:", JSON.stringify(snapshots, null, 2));
				const importLog = await prisma.import_log.create({
					data: {
						fileName: `Импорт chunk ${chunkIndex + 1}/${totalChunks}`,
						created: toCreate.length,
						updated: toUpdate.length,
						skipped,
						count: toCreate.length + toUpdate.length + skipped,
						message: [
							`Импорт завершён.`,
							`Создано: ${toCreate.length}`,
							`Обновлено: ${toUpdate.length}`,
							`Пропущено: ${skipped}`,
							removedCategoriesCount ? `Категорий удалено: ${removedCategoriesCount}` : null,
							localDuplicates.size ? `Повторы: ${Array.from(localDuplicates).slice(0, 5).join(", ")}` : null,
							unknownCategoryTitles.size ? `Неизвестные категории: ${Array.from(unknownCategoryTitles).slice(0, 5).join(", ")}` : null,
							`Изображения: ${preserveImages ? "сохранялись" : "заменялись"}`,
							`Наценка: ${JSON.stringify({ markupRules, defaultMarkup })}`,
						]
							.filter(Boolean)
							.join("\n"),
						userSnapshot: {
							id: user.id,
							// Дополнительные данные пользователя можно получить отдельным запросом если нужно
						},
						departmentSnapshot: {
							id: departmentId,
							name: userDepartment?.name,
						},
						productsSnapshot: snapshots,
						// Временные поля для совместимости
						userId: user.id,
						departmentId: departmentId,
						snapshots: JSON.stringify(snapshots),
					},
				});
				importLogId = importLog.id;
			}

			// Создаем логи товаров с ссылкой на лог импорта (только в product_log, НЕ в changeLog)
			if (logsToCreate.length > 0) {
				await Promise.all(
					logsToCreate.map((log) =>
						prisma.product_log.create({
							data: {
								action: log.action,
								message: log.message,
								userSnapshot: {
									id: log.userId,
									// Дополнительные данные пользователя можно получить отдельным запросом если нужно
								},
								departmentSnapshot: {
									id: log.departmentId,
									name: null,
								},
								productSnapshot: {
									id: log.productId,
									title: log.snapshotAfter?.title || log.snapshotBefore?.title || null,
									price: log.snapshotAfter?.price || log.snapshotBefore?.price || null,
									sku: log.snapshotAfter?.sku || log.snapshotBefore?.sku || null,
									brand: log.snapshotAfter?.brand || log.snapshotBefore?.brand || null,
								},
								// Временные поля для совместимости
								userId: log.userId,
								departmentId: log.departmentId,
								productId: log.productId,
								snapshotBefore: log.snapshotBefore ? JSON.stringify(log.snapshotBefore) : null,
								snapshotAfter: log.snapshotAfter ? JSON.stringify(log.snapshotAfter) : null,
								// Добавляем ссылку на лог импорта
								importLogId: importLogId,
							},
						})
					)
				);
			}

			return NextResponse.json({
				created: toCreate.length,
				updated: toUpdate.length,
				skipped,
				removedCategoriesCount,
				done: isFinalChunk,
				unknownCategoryTitles: Array.from(unknownCategoryTitles),
				localDuplicates: Array.from(localDuplicates).map((key) => key.split(" || ")[0]),
			});
		} catch (error) {
			console.error("❌ Ошибка в import-chunk:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["superadmin", "admin"]
);
