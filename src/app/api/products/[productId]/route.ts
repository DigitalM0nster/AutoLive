// src/app/api/products/[productId]/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

// ✅ GET — оставляем без изменений
export async function GET(_req: NextRequest, context: { params: Promise<{ productId: string }> }) {
	const { productId } = await context.params;

	try {
		const id = parseInt(productId);
		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		const product = await prisma.product.findUnique({
			where: { id },
			include: {
				category: { select: { id: true, title: true } },
				productFilterValues: {
					include: {
						filterValue: { include: { filter: true } },
					},
				},
			},
		});

		if (!product) {
			return NextResponse.json({ error: "Продукт не найден" }, { status: 404 });
		}

		const filtersMap: Record<number, { id: number; title: string; selected_values: { id: number; value: string }[] }> = {};

		for (const pfv of product.productFilterValues) {
			const filter = pfv.filterValue.filter;
			if (!filtersMap[filter.id]) {
				filtersMap[filter.id] = { id: filter.id, title: filter.title, selected_values: [] };
			}
			filtersMap[filter.id].selected_values.push({
				id: pfv.filterValue.id,
				value: pfv.filterValue.value,
			});
		}

		const structuredProduct = {
			id: product.id,
			sku: product.sku,
			title: product.title,
			description: product.description,
			supplierPrice: product.supplierPrice ?? null,
			price: product.price,
			image: product.image,
			brand: product.brand,
			category: product.category,
			filters: Object.values(filtersMap),
		};

		return NextResponse.json({ product: structuredProduct });
	} catch (error) {
		console.error("❌ Ошибка получения продукта:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// ✅ PUT — редактирование товара с подробным логом

// ✅ PUT — редактирование товара с подробным логом

export const PUT = withPermission(
	async (req, { user, scope }) => {
		const url = new URL(req.url);
		const productId = parseInt(url.pathname.split("/").pop()!);

		if (isNaN(productId)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		const body = await req.json();

		try {
			const existing = await prisma.product.findUnique({
				where: { id: productId },
				include: {
					department: { select: { id: true, name: true } },
					category: { select: { id: true, title: true } },
				},
			});

			if (!existing) {
				return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
			}

			if (scope === "department" && existing.departmentId !== user.departmentId) {
				return NextResponse.json({ error: "Недостаточно прав для редактирования этого товара" }, { status: 403 });
			}

			const rawSku = String(body.sku).trim();
			const rawBrand = String(body.brand).trim();
			const normalizedSku = rawSku.toLowerCase();
			const normalizedBrand = rawBrand.toLowerCase();

			const parseNullableFloat = (val: any) => {
				const num = parseFloat(val);
				return isNaN(num) ? null : num;
			};

			const parseNullableInt = (val: any) => {
				const num = parseInt(val);
				return isNaN(num) ? null : num;
			};

			const dataToUpdate: any = {
				sku: rawSku,
				title: String(body.title).trim(),
				description: body.description?.trim() || null,
				supplierPrice: parseNullableFloat(body.supplierPrice),
				price: parseFloat(body.price),
				brand: rawBrand,
				categoryId: parseNullableInt(body.categoryId),
				image: body.image?.trim() || null,
			};

			if (user.role === "superadmin") {
				const rawDepId = String(body.departmentId || "").trim();
				dataToUpdate.departmentId = parseNullableInt(rawDepId);

				if (dataToUpdate.departmentId === null) {
					return NextResponse.json({ error: "Поле 'Отдел' обязательно" }, { status: 400 });
				}
			}
			const departmentIdToCheck = dataToUpdate.departmentId ?? existing.departmentId;

			if (dataToUpdate.categoryId !== null) {
				const isAllowed = await prisma.departmentCategory.findFirst({
					where: {
						departmentId: departmentIdToCheck,
						categoryId: dataToUpdate.categoryId,
					},
				});

				if (!isAllowed) {
					return NextResponse.json({ error: "Категория не разрешена для выбранного отдела" }, { status: 400 });
				}
			}

			const duplicate = await prisma.product.findFirst({
				where: {
					id: { not: productId },
					departmentId: departmentIdToCheck,
					sku: normalizedSku,
					brand: normalizedBrand,
				},
			});

			if (duplicate) {
				return NextResponse.json({ error: "Товар с таким артикулом и брендом уже существует" }, { status: 409 });
			}

			console.log("▶️ BEFORE:", existing);
			console.log("▶️ AFTER:", dataToUpdate);

			// 🧠 Проверка реальных изменений
			const fieldsToCompare: [keyof typeof dataToUpdate, any, any][] = [
				["title", existing.title, dataToUpdate.title],
				["sku", existing.sku, dataToUpdate.sku],
				["brand", existing.brand, dataToUpdate.brand],
				["price", existing.price, dataToUpdate.price],
				["supplierPrice", existing.supplierPrice, dataToUpdate.supplierPrice],
				["description", existing.description, dataToUpdate.description],
				["image", existing.image, dataToUpdate.image],
				["categoryId", existing.categoryId, dataToUpdate.categoryId],
				["departmentId", existing.departmentId, dataToUpdate.departmentId ?? existing.departmentId],
			];

			const hasChanges = fieldsToCompare.some(([_, before, after]) => String(before) !== String(after));

			if (!hasChanges) {
				return NextResponse.json({ product: existing });
			}

			const updated = await prisma.product.update({
				where: { id: productId },
				data: dataToUpdate,
			});

			const updatedFull = await prisma.product.findUnique({
				where: { id: productId },
				include: {
					department: { select: { id: true, name: true } },
					category: { select: { id: true, title: true } },
				},
			});

			// Используем универсальную функцию логирования
			const { logProductChange } = await import("@/lib/universalLogging");
			await logProductChange({
				entityId: updated.id,
				adminId: user.id,
				message: "Товар обновлён",
				beforeData: existing,
				afterData: updatedFull,
			});

			return NextResponse.json({ product: updatedFull });
		} catch (error) {
			console.error("Ошибка обновления продукта:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);

// ✅ PATCH — быстрое редактирование основных полей
export const PATCH = withPermission(
	async (req, { user, scope }) => {
		const url = new URL(req.url);
		const productId = parseInt(url.pathname.split("/").pop()!);

		if (isNaN(productId)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		const body = await req.json();

		try {
			const existing = await prisma.product.findUnique({
				where: { id: productId },
				include: {
					department: { select: { id: true, name: true } },
				},
			});

			if (!existing) {
				return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
			}

			if (scope === "department" && existing.departmentId !== user.departmentId) {
				return NextResponse.json({ error: "Недостаточно прав для редактирования этого товара" }, { status: 403 });
			}

			// Обновляем только переданные поля
			const updateData: any = {};
			if (body.title !== undefined) updateData.title = String(body.title).trim();
			if (body.sku !== undefined) updateData.sku = String(body.sku).trim();
			if (body.price !== undefined) updateData.price = parseFloat(body.price);
			if (body.brand !== undefined) updateData.brand = String(body.brand).trim();
			if (body.description !== undefined) updateData.description = body.description ? String(body.description).trim() : null;

			const updated = await prisma.product.update({
				where: { id: productId },
				data: updateData,
				include: {
					department: { select: { id: true, name: true } },
				},
			});

			// Используем универсальную функцию логирования
			const { logProductChange } = await import("@/lib/universalLogging");
			await logProductChange({
				entityId: updated.id,
				adminId: user.id,
				message: "Быстрое редактирование товара",
				beforeData: existing,
				afterData: updated,
			});

			return NextResponse.json({ product: updated });
		} catch (error) {
			console.error("Ошибка быстрого обновления продукта:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);

// ✅ DELETE — удаление с подробным логом
export const DELETE = withPermission(
	async (req, { user, scope }) => {
		const url = new URL(req.url);
		const productId = parseInt(url.pathname.split("/").pop()!);

		if (isNaN(productId)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		try {
			const existing = await prisma.product.findUnique({ where: { id: productId } });

			if (!existing) {
				return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
			}

			if (scope === "department" && existing.departmentId !== user.departmentId) {
				return NextResponse.json({ error: "Недостаточно прав для удаления этого товара" }, { status: 403 });
			}

			await prisma.productFilterValue.deleteMany({ where: { productId } });
			await prisma.productAnalog.deleteMany({ where: { OR: [{ productId }, { analogId: productId }] } });
			await prisma.serviceKitItem.deleteMany({ where: { OR: [{ product_id: productId }, { analog_product_id: productId }] } });

			await prisma.product.delete({ where: { id: productId } });

			// ✅ Используем универсальную функцию логирования
			const { logProductChange } = await import("@/lib/universalLogging");
			await logProductChange({
				entityId: existing.id,
				adminId: user.id,
				message: "Товар удалён вручную",
				beforeData: existing,
			});

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("Ошибка при удалении товара:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);
