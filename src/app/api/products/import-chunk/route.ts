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

			for (let i = 0; i < rows.length; i++) {
				const row = rows[i];
				const sku = row[columns.sku]?.toString().trim();
				const title = row[columns.title]?.toString().trim();
				const brand = row[columns.brand]?.toString().trim();
				const priceRaw = row[columns.price];

				if (!sku || !title || !brand || !priceRaw) {
					skipped++;
					continue;
				}

				const key = `${sku.toLowerCase()}||${brand.toLowerCase()}`;
				if (lastByKey.get(key) !== i) {
					skipped++;
					continue;
				}

				const supplierPrice = typeof priceRaw === "string" ? parseFloat(priceRaw.replace(",", ".")) : priceRaw;
				if (!supplierPrice || isNaN(supplierPrice)) {
					skipped++;
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

			let createdProducts: { id: number; sku: string; brand: string }[] = [];

			if (toCreate.length > 0) {
				await prisma.product.createMany({
					data: toCreate,
					skipDuplicates: true,
				});

				const skus = toCreate.map((p) => p.sku.toLowerCase());
				const brands = toCreate.map((p) => p.brand.toLowerCase());

				createdProducts = await prisma.product.findMany({
					where: {
						sku: { in: skus },
						brand: { in: brands },
						departmentId,
					},
					select: { id: true, sku: true, brand: true },
				});

				for (const log of logsToCreate) {
					if (!log.productId && log.action === "create") {
						const match = createdProducts.find(
							(p) => log.snapshotAfter.sku?.toLowerCase() === p.sku.toLowerCase() && log.snapshotAfter.brand?.toLowerCase() === p.brand.toLowerCase()
						);
						if (match) log.productId = match.id;
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

			if (logsToCreate.length > 0) {
				await Promise.all(
					logsToCreate.map((log) =>
						prisma.productLog.create({
							data: log,
						})
					)
				);
			}

			const isFinalChunk = chunkIndex + 1 >= totalChunks;

			if (isFinalChunk) {
				const snapshotBefore: any[] = [];
				const snapshotAfter: any[] = [];

				for (const log of logsToCreate) {
					const base = {
						id: log.productId,
						sku: log.snapshotAfter?.sku,
						brand: log.snapshotAfter?.brand,
						title: log.snapshotAfter?.title,
						price: log.snapshotAfter?.price,
						supplierPrice: log.snapshotAfter?.supplierPrice,
						description: log.snapshotAfter?.description,
						image: log.snapshotAfter?.image,
						categoryId: log.snapshotAfter?.categoryId,
						departmentId: departmentId,
					};

					if (log.action === "create") {
						snapshotAfter.push(base);
					} else if (log.action === "update") {
						snapshotBefore.push({
							id: log.productId,
							sku: log.snapshotBefore?.sku,
							brand: log.snapshotBefore?.brand,
							title: log.snapshotBefore?.title,
							price: log.snapshotBefore?.price,
							supplierPrice: log.snapshotBefore?.supplierPrice,
							description: log.snapshotBefore?.description,
							image: log.snapshotBefore?.image,
							categoryId: log.snapshotBefore?.categoryId,
							departmentId: departmentId,
						});
						snapshotAfter.push(base);
					}
				}

				await prisma.importLog.create({
					data: {
						userId: user.id,
						fileName: `Импорт chunk ${chunkIndex + 1}/${totalChunks}`,
						created: toCreate.length,
						updated: toUpdate.length,
						message: [
							`Импорт завершён.`,
							`Создано: ${toCreate.length}`,
							`Обновлено: ${toUpdate.length}`,
							`Пропущено: ${skipped}`,
							`Категорий удалено: ${removedCategoriesCount}`,
							localDuplicates.size > 0 ? `Повторы: ${Array.from(localDuplicates).slice(0, 5).join(", ")}` : null,
							unknownCategoryTitles.size > 0 ? `Неизвестные категории: ${Array.from(unknownCategoryTitles).slice(0, 5).join(", ")}` : null,
							`Изображения: ${preserveImages ? "сохранялись" : "заменялись"}`,
							`Наценка: ${JSON.stringify({ markupRules, defaultMarkup })}`,
						]
							.filter(Boolean)
							.join("\n"),
						snapshotBefore,
						snapshotAfter,
					},
				});
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
