// src/app/api/products/[productId]/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

// ✅ GET — можно оставить открытым, если клиентам можно смотреть товары
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
				category: {
					select: { id: true, title: true },
				},
				productFilterValues: {
					include: {
						filterValue: {
							include: {
								filter: true,
							},
						},
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
				filtersMap[filter.id] = {
					id: filter.id,
					title: filter.title,
					selected_values: [],
				};
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
				select: { departmentId: true },
			});

			if (!existing) {
				return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
			}

			if (scope === "department" && existing.departmentId !== user.departmentId) {
				return NextResponse.json({ error: "Недостаточно прав для редактирования этого товара" }, { status: 403 });
			}

			// Приводим sku и brand к нижнему регистру только для проверки дубликатов
			const rawSku = String(body.sku).trim();
			const rawBrand = String(body.brand).trim();
			const normalizedSku = rawSku.toLowerCase();
			const normalizedBrand = rawBrand.toLowerCase();

			// Сбор данных
			const dataToUpdate: any = {
				sku: rawSku,
				title: String(body.title).trim(),
				description: body.description?.trim() || null,
				supplierPrice: body.supplierPrice !== "" ? parseFloat(body.supplierPrice) : null,
				price: parseFloat(body.price),
				brand: rawBrand,
				categoryId: body.categoryId !== "" ? parseInt(body.categoryId) : null,
				image: body.image?.trim() || null,
			};

			// Обработка departmentId для superadmin
			if (user.role === "superadmin") {
				const rawDepId = String(body.departmentId || "").trim();
				dataToUpdate.departmentId = rawDepId ? parseInt(rawDepId) : null;

				if (dataToUpdate.departmentId === null || isNaN(dataToUpdate.departmentId)) {
					return NextResponse.json({ error: "Поле 'Отдел' обязательно" }, { status: 400 });
				}
			}

			const departmentIdToCheck = dataToUpdate.departmentId ?? existing.departmentId;

			// Проверка на дубликат (исключаем текущий товар)
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

			const product = await prisma.product.update({
				where: { id: productId },
				data: dataToUpdate,
				include: {
					department: true,
				},
			});

			return NextResponse.json({ product });
		} catch (error) {
			console.error("Ошибка обновления продукта:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);

// ✅ DELETE — только admin/superadmin с правом edit_products
export const DELETE = withPermission(
	async (req, { user, scope }) => {
		const url = new URL(req.url);
		const productId = parseInt(url.pathname.split("/").pop()!);

		if (isNaN(productId)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		try {
			const existing = await prisma.product.findUnique({
				where: { id: productId },
				select: { id: true, departmentId: true },
			});

			if (!existing) {
				return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
			}

			if (scope === "department" && existing.departmentId !== user.departmentId) {
				return NextResponse.json({ error: "Недостаточно прав для удаления этого товара" }, { status: 403 });
			}

			await prisma.productFilterValue.deleteMany({ where: { productId } });
			await prisma.productAnalog.deleteMany({ where: { OR: [{ productId }, { analogId: productId }] } });
			await prisma.serviceKitItem.deleteMany({ where: { OR: [{ productId }, { analogProductId: productId }] } });

			await prisma.product.delete({ where: { id: productId } });

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("Ошибка при удалении товара:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);
