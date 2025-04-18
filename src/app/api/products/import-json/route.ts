// src/app/api/products/import-json/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";

export const POST = withPermission(
	async (req, { user }) => {
		try {
			const { rows, columns, startRow, markupRules, defaultMarkup, preserveImages, departmentId: rawDepartmentId } = await req.json();

			const departmentId = user.role === "superadmin" ? rawDepartmentId : user.departmentId ?? null;

			if (!departmentId) {
				return NextResponse.json({ error: "Отдел не указан" }, { status: 400 });
			}

			// ───── MARKUP ─────
			function applyMarkup(price: number, rules: typeof markupRules, fallback: typeof defaultMarkup): number {
				for (const rule of rules) {
					if (rule.value !== null && !isNaN(rule.value) && price >= (rule.from ?? 0) && price <= (rule.to ?? Infinity)) {
						return rule.type === "%" ? Math.round(price * (1 + rule.value / 100)) : Math.round(price + rule.value);
					}
				}
				return fallback.type === "%" ? Math.round(price * (1 + fallback.value / 100)) : Math.round(price + fallback.value);
			}

			// ───── ФИЛЬТРАЦИЯ СТРОК ─────
			const filteredRows: any[][] = rows.slice(Math.max(startRow - 1, 0)).filter((row: any[]) => row.length >= 4); // минимум sku, title, price, brand

			// ───── КАТЕГОРИИ ─────
			const allCategories = await prisma.category.findMany({
				select: { id: true, title: true },
			});
			const categoryMap = new Map(allCategories.map((c) => [c.title.trim(), c.id]));
			const unauthorizedCategories = new Set<string>();

			// ───── СУЩЕСТВУЮЩИЕ ТОВАРЫ ─────
			const existing = await prisma.product.findMany({
				where: { departmentId },
				select: { id: true, sku: true, brand: true, image: true },
			});

			const existingMap = new Map<string, (typeof existing)[number]>();
			for (const p of existing) {
				existingMap.set(`${p.sku.toLowerCase()}||${p.brand.toLowerCase()}`, p);
			}

			const toCreate: any[] = [];
			const toUpdate: { id: number; data: any }[] = [];

			for (const row of filteredRows) {
				const sku = row[columns.sku]?.toString().trim();
				const title = row[columns.title]?.toString().trim();
				const brand = row[columns.brand]?.toString().trim();
				const priceRaw = row[columns.price];

				if (!sku || !title || !brand || !priceRaw) continue;

				const supplierPrice = typeof priceRaw === "string" ? parseFloat(priceRaw.replace(",", ".")) : priceRaw;
				if (!supplierPrice || isNaN(supplierPrice)) continue;

				const price = applyMarkup(supplierPrice, markupRules, defaultMarkup);
				const description = columns.description !== -1 ? row[columns.description]?.toString().trim() : null;
				const image = columns.image !== -1 ? row[columns.image]?.toString().trim() || null : null;
				const categoryTitle = columns.category !== -1 ? row[columns.category]?.toString().trim() : null;

				let categoryId: number | null = null;
				if (categoryTitle) {
					categoryId = categoryMap.get(categoryTitle);
					if (!categoryId && user.role === "superadmin") {
						const created = await prisma.category.create({ data: { title: categoryTitle } });
						categoryMap.set(categoryTitle, created.id);
						categoryId = created.id;
					}
					if (!categoryId) {
						unauthorizedCategories.add(categoryTitle);
						continue;
					}
				}

				const key = `${sku.toLowerCase()}||${brand.toLowerCase()}`;
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

			// ───── СОЗДАНИЕ ─────
			if (toCreate.length > 0) {
				for (let i = 0; i < toCreate.length; i += 1000) {
					await prisma.product.createMany({
						data: toCreate.slice(i, i + 1000),
						skipDuplicates: true,
					});
				}
			}

			// ───── ОБНОВЛЕНИЕ ─────
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

			// ───── ЛОГ ─────
			await prisma.importLog.create({
				data: {
					userId: user.id,
					fileName: `JSON импорт ${new Date().toISOString()}`,
					created: toCreate.length,
					updated: toUpdate.length,
					message: unauthorizedCategories.size > 0 ? `Не удалось создать категории: ${[...unauthorizedCategories].join(", ")}` : null,
				},
			});

			return NextResponse.json({
				created: toCreate.length,
				updated: toUpdate.length,
				skipped: filteredRows.length - toCreate.length - toUpdate.length,
				missingCategories: [...unauthorizedCategories],
			});
		} catch (err) {
			console.error("Ошибка при JSON импорте:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["superadmin", "admin"]
);
