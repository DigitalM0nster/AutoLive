// src/app/api/products/[productId]/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";
import jwt from "jsonwebtoken";
import { FilterValueForLog, FilterValueFromRequest, FilterRequest } from "@/lib/types";

// ✅ GET — получение товара с проверкой прав доступа
export async function GET(req: NextRequest, context: { params: Promise<{ productId: string }> }) {
	const { productId } = await context.params;

	try {
		const id = parseInt(productId);
		if (isNaN(id)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		// Получаем токен из cookies
		const token = req.cookies.get("authToken")?.value;
		if (!token) {
			return NextResponse.json({ error: "Нет токена авторизации" }, { status: 401 });
		}

		// Декодируем токен для получения информации о пользователе
		let user: any;
		try {
			user = jwt.verify(token, process.env.JWT_SECRET!);
		} catch (e) {
			return NextResponse.json({ error: "Невалидный токен" }, { status: 401 });
		}

		// Получаем товар с полной информацией
		const product = await prisma.product.findUnique({
			where: { id },
			include: {
				department: { select: { id: true, name: true } },
				category: { select: { id: true, title: true } },
				productFilterValues: {
					include: {
						filterValue: {
							include: {
								filter: { select: { id: true, title: true } },
							},
						},
					},
				},
			},
		});

		if (!product) {
			return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
		}

		// Проверяем права доступа
		if (user.role === "manager" && product.departmentId !== user.departmentId) {
			return NextResponse.json({ error: "Недостаточно прав для просмотра этого товара" }, { status: 403 });
		}

		// Получаем разрешенные категории для отдела товара
		let allowedCategories: { id: number; title: string }[] = [];
		if (product.departmentId) {
			const departmentCategories = await prisma.departmentCategory.findMany({
				where: { departmentId: product.departmentId },
				include: {
					category: { select: { id: true, title: true } },
				},
			});
			allowedCategories = departmentCategories.map((dc) => dc.category);
		}

		// Определяем, может ли пользователь изменять категорию
		const canChangeCategory = allowedCategories.length > 0;

		// Получаем фильтры для категории товара с выбранными значениями
		let categoryFilters: any[] = [];
		if (product.categoryId) {
			const filters = await prisma.filter.findMany({
				where: { categoryId: product.categoryId },
				include: {
					values: { select: { id: true, value: true } },
				},
			});

			// Получаем выбранные значения для каждого фильтра
			categoryFilters = await Promise.all(
				filters.map(async (filter) => {
					const selectedValues = await prisma.productFilterValue.findMany({
						where: {
							productId: product.id,
							filterValue: {
								filterId: filter.id,
							},
						},
						include: {
							filterValue: { select: { id: true, value: true } },
						},
					});

					console.log("🔍 API - Filter:", filter.id, filter.type, "Selected values:", selectedValues);

					return {
						...filter,
						selected_values: selectedValues.map((pfv) => pfv.filterValue),
					};
				})
			);
		}

		// Формируем ответ с дополнительной информацией
		const response = {
			...product,
			allowedCategories,
			canChangeCategory,
			filters: categoryFilters,
		};

		return NextResponse.json({ product: response });
	} catch (error) {
		console.error("❌ Ошибка получения продукта:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// ✅ PATCH — редактирование товара (универсальный метод)
export const PATCH = withPermission(
	async (req, { user, scope }) => {
		const url = new URL(req.url);
		const productId = parseInt(url.pathname.split("/").pop()!);

		if (isNaN(productId)) {
			return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
		}

		const formData = await req.formData();
		console.log("🔍 API Debug - Получен PATCH запрос для товара:", productId);

		try {
			const existing = await prisma.product.findUnique({
				where: { id: productId },
				include: {
					department: { select: { id: true, name: true } },
					category: { select: { id: true, title: true } },
					productFilterValues: {
						include: {
							filterValue: {
								include: {
									filter: { select: { id: true, title: true } },
								},
							},
						},
					},
				},
			});

			if (!existing) {
				return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
			}

			if (scope === "department" && existing.departmentId !== user.departmentId) {
				return NextResponse.json({ error: "Недостаточно прав для редактирования этого товара" }, { status: 403 });
			}

			// Проверяем права на изменение отдела - только суперадмин может изменять отдел товара
			if (formData.get("departmentId") !== null) {
				if (user.role !== "superadmin") {
					return NextResponse.json({ error: "Только суперадмин может изменять отдел товара" }, { status: 403 });
				}
			}

			// Проверяем права на изменение категории - только админ и суперадмин могут изменять категорию
			if (formData.get("categoryId") !== null && !["admin", "superadmin"].includes(user.role)) {
				return NextResponse.json({ error: "Только админ и суперадмин могут изменять категорию товара" }, { status: 403 });
			}

			// Валидация цены поставщика
			const supplierPriceValue = formData.get("supplierPrice");
			const priceValue = formData.get("price");
			if (supplierPriceValue !== null && priceValue !== null) {
				const supplierPrice = supplierPriceValue ? parseFloat(supplierPriceValue as string) : null;
				const sitePrice = parseFloat(priceValue as string);

				if (supplierPrice !== null && supplierPrice > sitePrice) {
					return NextResponse.json({ error: "Цена поставщика не может быть больше цены на сайте" }, { status: 400 });
				}
			}

			// Обновляем только переданные поля
			const updateData: any = {};
			const titleValue = formData.get("title");
			if (titleValue !== null) updateData.title = String(titleValue).trim();

			const skuValue = formData.get("sku");
			if (skuValue !== null) updateData.sku = String(skuValue).trim();

			if (priceValue !== null) updateData.price = parseFloat(priceValue as string);

			if (supplierPriceValue !== null) updateData.supplierPrice = supplierPriceValue ? parseFloat(supplierPriceValue as string) : null;

			const brandValue = formData.get("brand");
			if (brandValue !== null) updateData.brand = String(brandValue).trim();

			const descriptionValue = formData.get("description");
			if (descriptionValue !== null) updateData.description = descriptionValue ? String(descriptionValue).trim() : null;

			const departmentIdValue = formData.get("departmentId");
			if (departmentIdValue !== null) {
				const depId = parseInt(departmentIdValue as string);
				if (!isNaN(depId)) updateData.departmentId = depId;
			}

			const categoryIdValue = formData.get("categoryId");
			if (categoryIdValue !== null) {
				const catId = parseInt(categoryIdValue as string);
				if (!isNaN(catId)) updateData.categoryId = catId;
			}

			// Обрабатываем удаление изображения
			const deleteImage = formData.get("deleteImage");
			console.log("🔍 API Debug - deleteImage:", deleteImage);
			if (deleteImage === "true") {
				updateData.image = null;
				console.log("✅ API Debug - Устанавливаем image = null");
			}

			// Обрабатываем загрузку изображения (только если не удаляем)
			const imageFile = formData.get("imageFile") as File;
			console.log("🔍 API Debug - imageFile:", imageFile ? `File: ${imageFile.name}, size: ${imageFile.size}` : "null");
			if (imageFile && imageFile.size > 0 && deleteImage !== "true") {
				try {
					// Используем простую систему загрузки файлов
					const { uploadFile, validateFile } = await import("@/lib/simpleFileUpload");

					// Валидируем файл
					const validation = validateFile(imageFile);
					if (!validation.isValid) {
						return NextResponse.json({ error: validation.error }, { status: 400 });
					}

					// Загружаем файл
					const uploadResult = await uploadFile(imageFile, {
						prefix: "product",
						entityId: productId,
					});

					console.log("✅ API Debug - Изображение успешно загружено:", uploadResult.url);

					// Сохраняем URL изображения в БД
					updateData.image = uploadResult.url;
				} catch (error) {
					console.error("❌ API Debug - Ошибка при загрузке изображения:", error);
					return NextResponse.json({ error: "Ошибка при загрузке изображения" }, { status: 500 });
				}
			}

			const updated = await prisma.product.update({
				where: { id: productId },
				data: updateData,
				include: {
					department: { select: { id: true, name: true } },
					category: { select: { id: true, title: true } },
					productFilterValues: {
						include: {
							filterValue: {
								include: {
									filter: { select: { id: true, title: true } },
								},
							},
						},
					},
				},
			});

			// Обрабатываем фильтры товара
			const filterValuesString = formData.get("filterValues");
			if (filterValuesString) {
				try {
					const filterValues = JSON.parse(filterValuesString as string);
					console.log("🔍 API - Received filterValues:", filterValues);

					// Удаляем все существующие фильтры товара
					await prisma.productFilterValue.deleteMany({
						where: { productId: productId },
					});

					// Обрабатываем каждый фильтр
					for (const filter of filterValues) {
						console.log("🔍 API - Processing filter:", filter);

						// Получаем информацию о фильтре
						const filterInfo = await prisma.filter.findUnique({
							where: { id: filter.filterId },
							select: { type: true },
						});

						console.log("🔍 API - Filter info:", filterInfo);

						if (filterInfo?.type === "range") {
							// Для диапазона используем rangeValue
							console.log("🔍 API - Processing range filter:", filter.filterId, "rangeValue:", filter.rangeValue);
							if (filter.rangeValue !== undefined && filter.rangeValue !== null) {
								// Ищем существующее значение для этого фильтра и товара
								const existingValue = await prisma.productFilterValue.findFirst({
									where: {
										productId,
										filterValue: {
											filterId: filter.filterId,
										},
									},
									include: {
										filterValue: true,
									},
								});

								console.log("🔍 API - Existing value:", existingValue);

								if (existingValue) {
									// Обновляем существующее значение
									console.log("🔍 API - Updating existing value:", existingValue.filterValueId, "to:", filter.rangeValue.toString());
									await prisma.filterValue.update({
										where: { id: existingValue.filterValueId },
										data: { value: filter.rangeValue.toString() },
									});
								} else {
									// Создаем новое значение
									console.log("🔍 API - Creating new value for filter:", filter.filterId, "value:", filter.rangeValue.toString());
									const newFilterValue = await prisma.filterValue.create({
										data: {
											filterId: filter.filterId,
											value: filter.rangeValue.toString(),
										},
									});

									// Связываем с товаром
									await prisma.productFilterValue.create({
										data: {
											productId,
											filterValueId: newFilterValue.id,
										},
									});
									console.log("🔍 API - Created and linked new value:", newFilterValue.id);
								}
							}
						} else if (filter.valueIds && filter.valueIds.length > 0) {
							// Для остальных типов фильтров используем существующие ID
							const filterValueRecords = filter.valueIds.map((valueId: number) => ({
								productId,
								filterValueId: valueId,
							}));

							await prisma.productFilterValue.createMany({
								data: filterValueRecords,
							});
						}
					}
				} catch (error) {
					console.error("Ошибка при обработке фильтров:", error);
					return NextResponse.json({ error: "Ошибка при обработке фильтров" }, { status: 400 });
				}
			}

			// Проверяем, есть ли реальные изменения
			const hasRealChanges =
				(updateData.title !== undefined && updateData.title !== existing.title) ||
				(updateData.sku !== undefined && updateData.sku !== existing.sku) ||
				(updateData.price !== undefined && updateData.price !== existing.price) ||
				(updateData.supplierPrice !== undefined && updateData.supplierPrice !== existing.supplierPrice) ||
				(updateData.brand !== undefined && updateData.brand !== existing.brand) ||
				(updateData.description !== undefined && updateData.description !== existing.description) ||
				(updateData.departmentId !== undefined && updateData.departmentId !== existing.departmentId) ||
				(updateData.categoryId !== undefined && updateData.categoryId !== existing.categoryId) ||
				(updateData.image !== undefined && updateData.image !== existing.image);

			console.log("🔍 API Debug - Проверка изменений:");
			console.log("🔍 API Debug - updateData.image:", updateData.image);
			console.log("🔍 API Debug - existing.image:", existing.image);
			console.log("🔍 API Debug - Изменение изображения:", updateData.image !== undefined && updateData.image !== existing.image);
			console.log("🔍 API Debug - hasRealChanges:", hasRealChanges);

			// Логируем только если есть реальные изменения
			if (hasRealChanges) {
				console.log("✅ API Debug - Логируем изменения товара");
				// Используем универсальную функцию логирования
				const { logProductChange } = await import("@/lib/universalLogging");
				await logProductChange({
					entityId: updated.id,
					adminId: user.id,
					message: "Редактирование товара",
					beforeData: existing,
					afterData: updated,
				});
				console.log("✅ API Debug - Логирование завершено");
			} else {
				console.log("ℹ️ API Debug - Нет изменений для логирования");
			}

			console.log("✅ API Debug - Товар успешно обновлен:", updated.id, "image:", updated.image);
			return NextResponse.json({ product: updated });
		} catch (error) {
			console.error("❌ API Debug - Ошибка обновления продукта:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);

// ✅ DELETE — удаление товара
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
				include: {
					department: { select: { id: true, name: true } },
					category: { select: { id: true, title: true } },
					productFilterValues: {
						include: {
							filterValue: {
								include: {
									filter: { select: { id: true, title: true } },
								},
							},
						},
					},
				},
			});

			if (!existing) {
				return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
			}

			if (scope === "department" && existing.departmentId !== user.departmentId) {
				return NextResponse.json({ error: "Недостаточно прав для удаления этого товара" }, { status: 403 });
			}

			// Удаляем связанные записи фильтров товара
			await prisma.productFilterValue.deleteMany({
				where: { productId: productId },
			});

			// Удаляем товар
			await prisma.product.delete({
				where: { id: productId },
			});

			// Логируем удаление
			const { logProductChange } = await import("@/lib/universalLogging");
			await logProductChange({
				entityId: productId,
				adminId: user.id,
				message: "Удаление товара",
				beforeData: existing,
				afterData: null,
			});

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("Ошибка удаления продукта:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_products",
	["admin", "superadmin"]
);
