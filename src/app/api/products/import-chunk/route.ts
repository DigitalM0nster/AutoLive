// src/app/api/products/import-chunk/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";

export const POST = withPermission(
	async (req, { user }) => {
		try {
			const { rows, columns, markupRules, defaultMarkup, preserveImages, departmentId: rawDepartmentId, chunkIndex, totalChunks } = await req.json();

			console.log("Чанк:", chunkIndex + 1, "из", totalChunks);
			console.log("Получено строк:", rows.length);

			const departmentId = user.role === "superadmin" ? rawDepartmentId : user.departmentId ?? null;
			if (!departmentId) {
				console.warn("Не указан departmentId");
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
				select: { id: true, sku: true, brand: true, image: true },
			});
			const existingMap = new Map<string, (typeof existing)[number]>();
			for (const p of existing) {
				existingMap.set(`${p.sku.toLowerCase()}||${p.brand.toLowerCase()}`, p);
			}

			// 👇 определим последние строки по ключу sku+brand и найдём локальные дубли
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

			let skipped = 0;
			let removedCategoriesCount = 0;
			const unknownCategoryTitles = new Set<string>();

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

				// 👇 Пропускаем, если это не последняя строка с этим sku+brand
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
					toUpdate.push({
						id: existingProduct.id,
						data: {
							title,
							price,
							supplierPrice,
							categoryId,
							description,
							image: image || (preserveImages ? existingProduct.image : null),
						},
					});
				} else {
					toCreate.push({
						sku,
						title,
						brand,
						price,
						supplierPrice,
						description,
						image,
						categoryId,
						departmentId,
					});
				}
			}

			if (toCreate.length > 0) {
				await prisma.product.createMany({
					data: toCreate,
					skipDuplicates: true,
				});
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

			return NextResponse.json({
				created: toCreate.length,
				updated: toUpdate.length,
				skipped,
				removedCategoriesCount,
				done: chunkIndex + 1 >= totalChunks,
				unknownCategoryTitles: Array.from(unknownCategoryTitles),
				localDuplicates: Array.from(localDuplicates).map((key) => key.split("||")[0]),
			});
		} catch (error) {
			console.error("Ошибка в import-chunk:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["superadmin", "admin"]
);
