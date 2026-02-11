import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

interface ExtendedRequestContext {
	user: any;
	scope: string;
}

export const GET = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			// Получаем importLogId из URL
			const importLogId = Number(req.nextUrl.pathname.split("/")[4]); // /api/products/logs/[importLogId]/products

			if (isNaN(importLogId)) {
				return NextResponse.json({ error: "Некорректный ID лога импорта" }, { status: 400 });
			}

			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "10", 10);
			const skip = (page - 1) * limit;

			// Фильтр по действию
			const action = searchParams.get("action");
			const actionFilter = action && action !== "all" ? { action } : {};

			// Фильтр по поиску товара
			const productSearch = searchParams.get("productSearch");

			// Получаем информацию о логе импорта
			const importLog = await prisma.import_log.findUnique({
				where: { id: importLogId },
			});

			if (!importLog) {
				return NextResponse.json({ error: "Лог импорта не найден" }, { status: 404 });
			}

			// Получаем логи товаров для конкретного импорта
			const where: any = {
				importLogId: importLogId,
				...actionFilter,
			};

			const logs = await prisma.product_log.findMany({
				where,
				orderBy: {
					createdAt: "desc",
				},
			});

			// Преобразуем логи в нужный формат
			let formattedLogs = logs.map((log) => {
				const userSnapshot = log.userSnapshot as any;
				let departmentSnapshot = log.departmentSnapshot as any;
				const snapshotBefore = (log.productSnapshotBefore as any) ?? null;
				const snapshotAfter = (log.productSnapshotAfter as any) ?? null;

				// Если departmentSnapshot пустой, заполняем его из снапшотов
				if (!departmentSnapshot || !departmentSnapshot.id) {
					const departmentFromSnapshot = snapshotBefore?.department || snapshotAfter?.department;
					if (departmentFromSnapshot) {
						departmentSnapshot = {
							id: departmentFromSnapshot.id,
							name: departmentFromSnapshot.name,
						};
					}
				}

				return {
					id: log.id,
					createdAt: log.createdAt,
					action: log.action,
					message: log.message,
					admin: userSnapshot
						? {
								id: userSnapshot.id,
								first_name: userSnapshot.first_name,
								last_name: userSnapshot.last_name,
								middle_name: userSnapshot.middle_name,
								phone: userSnapshot.phone,
								role: userSnapshot.role,
								department: userSnapshot.department,
						  }
						: null,
					targetProduct: snapshotBefore
						? {
								id: snapshotBefore.id,
								title: snapshotBefore.title,
								sku: snapshotBefore.sku,
								brand: snapshotBefore.brand,
								price: snapshotBefore.price,
								category: snapshotBefore.category,
								description: snapshotBefore.description,
								department: snapshotBefore.department,
						  }
						: snapshotAfter
						? {
								id: snapshotAfter.id,
								title: snapshotAfter.title,
								sku: snapshotAfter.sku,
								brand: snapshotAfter.brand,
								price: snapshotAfter.price,
								category: snapshotAfter.category,
								description: snapshotAfter.description,
								department: snapshotAfter.department,
						  }
						: null,
					department: departmentSnapshot
						? {
								id: departmentSnapshot.id,
								name: departmentSnapshot.name,
						  }
						: null,
					snapshotBefore,
					snapshotAfter,
					userSnapshot,
					departmentSnapshot,
					importLogId: log.importLogId,
				};
			});

			// Фильтрация по поиску товара
			if (productSearch && productSearch.trim() !== "") {
				const searchTerm = productSearch.trim().toLowerCase();

				// Получаем уникальные ID продуктов из логов для поиска их текущих данных
				const productIds = new Set<number>();
				formattedLogs.forEach((log) => {
					if (log.targetProduct?.id) {
						productIds.add(log.targetProduct.id);
					}
					if (log.snapshotBefore?.id) {
						productIds.add(log.snapshotBefore.id);
					}
					if (log.snapshotAfter?.id) {
						productIds.add(log.snapshotAfter.id);
					}
				});

				// Получаем актуальные данные продуктов из базы данных
				const currentProducts = await prisma.product.findMany({
					where: {
						id: { in: Array.from(productIds) },
					},
					select: {
						id: true,
						title: true,
						sku: true,
						brand: true,
					},
				});

				// Создаем Map для быстрого поиска актуальных данных продукта
				const currentProductsMap = new Map(currentProducts.map((product) => [product.id, product]));

				formattedLogs = formattedLogs.filter((log) => {
					// Проверяем targetProduct (snapshotAfter для созданных/обновленных продуктов)
					if (log.targetProduct) {
						const targetProductName = log.targetProduct.title?.toLowerCase() || "";
						const targetProductSku = log.targetProduct.sku?.toLowerCase() || "";
						const targetProductBrand = log.targetProduct.brand?.toLowerCase() || "";

						// Поиск по данным из снапшота
						if (targetProductName.includes(searchTerm) || targetProductSku.includes(searchTerm) || targetProductBrand.includes(searchTerm)) {
							return true;
						}

						// Поиск по текущим данным продукта из базы данных
						const currentProduct = currentProductsMap.get(log.targetProduct.id);
						if (currentProduct) {
							const currentName = currentProduct.title?.toLowerCase() || "";
							const currentSku = currentProduct.sku?.toLowerCase() || "";
							const currentBrand = currentProduct.brand?.toLowerCase() || "";

							if (currentName.includes(searchTerm) || currentSku.includes(searchTerm) || currentBrand.includes(searchTerm)) {
								return true;
							}
						}
					}

					// Проверяем snapshotBefore для удаленных продуктов
					if (log.snapshotBefore) {
						const snapshotBeforeName = log.snapshotBefore.title?.toLowerCase() || "";
						const snapshotBeforeSku = log.snapshotBefore.sku?.toLowerCase() || "";
						const snapshotBeforeBrand = log.snapshotBefore.brand?.toLowerCase() || "";

						// Поиск по данным из снапшота
						if (snapshotBeforeName.includes(searchTerm) || snapshotBeforeSku.includes(searchTerm) || snapshotBeforeBrand.includes(searchTerm)) {
							return true;
						}

						// Поиск по текущим данным продукта из базы данных (если продукт не удален)
						const currentProduct = currentProductsMap.get(log.snapshotBefore.id);
						if (currentProduct) {
							const currentName = currentProduct.title?.toLowerCase() || "";
							const currentSku = currentProduct.sku?.toLowerCase() || "";
							const currentBrand = currentProduct.brand?.toLowerCase() || "";

							if (currentName.includes(searchTerm) || currentSku.includes(searchTerm) || currentBrand.includes(searchTerm)) {
								return true;
							}
						}
					}

					// Проверяем snapshotAfter для созданных/обновленных продуктов
					if (log.snapshotAfter) {
						const snapshotAfterName = log.snapshotAfter.title?.toLowerCase() || "";
						const snapshotAfterSku = log.snapshotAfter.sku?.toLowerCase() || "";
						const snapshotAfterBrand = log.snapshotAfter.brand?.toLowerCase() || "";

						// Поиск по данным из снапшота
						if (snapshotAfterName.includes(searchTerm) || snapshotAfterSku.includes(searchTerm) || snapshotAfterBrand.includes(searchTerm)) {
							return true;
						}
					}

					return false;
				});
			}

			// Получаем общее количество отфильтрованных записей
			const total = formattedLogs.length;

			// Применяем пагинацию к отфильтрованным данным
			const paginatedLogs = formattedLogs.slice(skip, skip + limit);

			const totalPages = Math.ceil(total / limit);

			// Функция для проверки, является ли товар пустым
			const isEmptyProduct = (product: any): boolean => {
				// Проверяем каждое поле более тщательно
				const hasTitle =
					product.title &&
					typeof product.title === "string" &&
					product.title.trim() !== "" &&
					product.title.trim() !== "—" &&
					product.title.trim() !== "null" &&
					product.title.trim() !== "undefined";

				const hasSku =
					product.sku &&
					typeof product.sku === "string" &&
					product.sku.trim() !== "" &&
					product.sku.trim() !== "—" &&
					product.sku.trim() !== "null" &&
					product.sku.trim() !== "undefined";

				const hasBrand =
					product.brand &&
					typeof product.brand === "string" &&
					product.brand.trim() !== "" &&
					product.brand.trim() !== "—" &&
					product.brand.trim() !== "null" &&
					product.brand.trim() !== "undefined";

				const hasPrice =
					product.price !== null &&
					product.price !== undefined &&
					product.price !== "" &&
					product.price !== "—" &&
					product.price !== 0 &&
					!isNaN(Number(product.price)) &&
					Number(product.price) > 0;

				// Если ни одно из основных полей не заполнено, считаем товар пустым
				return !hasTitle && !hasSku && !hasBrand && !hasPrice;
			};

			// Парсим данные о пропущенных товарах и повторах из лога импорта
			let skippedProducts: any[] = [];
			let duplicateProducts: any[] = [];

			try {
				if (importLog.snapshots) {
					const snapshots = JSON.parse(importLog.snapshots);
					if (Array.isArray(snapshots)) {
						// Разделяем товары по статусу
						snapshots.forEach((product: any) => {
							if (product.status === "skipped") {
								// Проверяем, не является ли товар пустым
								const isEmpty = isEmptyProduct(product);

								if (!isEmpty) {
									// Добавляем только непустые товары как обычные пропущенные товары
									skippedProducts.push({
										...product,
										skipReason: product.reason || "Причина не указана",
										isEmpty: false,
									});
								}
								// Пустые товары просто игнорируем - не добавляем в результат
							} else if (product.status === "duplicate") {
								duplicateProducts.push({
									...product,
									duplicateReason: product.reason || "Товар уже существует",
								});
							}
						});
					}
				}
			} catch (e) {
				// Игнорируем ошибки парсинга
			}

			return NextResponse.json({
				data: paginatedLogs,
				total,
				totalPages,
				currentPage: page,
				importLog: {
					id: importLog.id,
					fileName: importLog.fileName,
					created: importLog.created,
					updated: importLog.updated,
					skipped: importLog.skipped,
					message: importLog.message,
				},
				skippedProducts,
				duplicateProducts,
			});
		} catch (err) {
			console.error("Ошибка при получении логов товаров импорта:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_products_logs",
	["superadmin", "admin", "manager"]
);
