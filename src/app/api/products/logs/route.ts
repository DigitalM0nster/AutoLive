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
			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "10", 10);
			const skip = (page - 1) * limit;

			// Фильтр по действию
			const action = searchParams.get("action");
			const isImportFilter = action === "import";
			const showAllActions = !action || action === "all";

			// Фильтр по дате
			const startDate = searchParams.get("startDate");
			const endDate = searchParams.get("endDate");
			const dateFilter: any = {};
			if (startDate || endDate) {
				if (startDate) {
					dateFilter.gte = new Date(startDate);
				}
				if (endDate) {
					dateFilter.lte = new Date(endDate + "T23:59:59.999Z");
				}
			}

			// Фильтр по отделу
			const departmentId = searchParams.get("departmentId");
			const departmentFilter: any = {};
			if (departmentId && departmentId !== "all") {
				departmentFilter.departmentId = parseInt(departmentId, 10);
			}

			let allLogs: any[] = [];

			// Если показываем все действия или только импорты - добавляем логи импорта
			if (isImportFilter || showAllActions) {
				// Если фильтр по импорту - получаем только логи импорта
				const importWhere: any = {};

				if (Object.keys(dateFilter).length > 0) {
					importWhere.createdAt = dateFilter;
				}

				// Применяем фильтр по отделу к логам импорта
				if (Object.keys(departmentFilter).length > 0) {
					importWhere.departmentId = departmentFilter.departmentId;
				}

				const importLogs = await prisma.import_log.findMany({
					where: importWhere,
					orderBy: {
						createdAt: "desc",
					},
				});

				// Преобразуем логи импорта в нужный формат
				allLogs = importLogs.map((log) => {
					const departmentSnapshot = log.departmentSnapshot as any;

					return {
						id: `import_${log.id}`, // Уникальный ID для логов импорта
						createdAt: log.createdAt,
						action: "import",
						message: log.message || `Импорт: создано ${log.created}, обновлено ${log.updated}, пропущено ${log.skipped}`,
						admin: null, // Будет заполнено позже
						targetProduct: null,
						department: departmentSnapshot ? { id: departmentSnapshot.id, name: departmentSnapshot.name } : null, // Отдел импорта из снапшота
						snapshotBefore: null,
						snapshotAfter: null,
						userSnapshot: null,
						departmentSnapshot: departmentSnapshot, // Снапшот отдела импорта
						importLogId: log.id, // Для логов импорта это ID самого лога импорта
						importLogData: log, // Сохраняем данные лога импорта
					};
				});
			}

			// Если показываем все действия или только обычные логи товаров - добавляем обычные логи товаров
			if (showAllActions || (!isImportFilter && action && action !== "import")) {
				// Получаем обычные логи товаров (НЕ связанные с импортом)
				const where: any = {
					importLogId: null, // Исключаем логи при импорте
				};

				if (Object.keys(dateFilter).length > 0) {
					where.createdAt = dateFilter;
				}

				if (Object.keys(departmentFilter).length > 0) {
					where.departmentId = departmentFilter.departmentId;
				}

				const logs = await prisma.product_log.findMany({
					where,
					orderBy: {
						createdAt: "desc",
					},
				});

				// Преобразуем логи товаров в нужный формат
				const productLogs = logs.map((log) => {
					const userSnapshot = log.userSnapshot as any;
					const departmentSnapshot = log.departmentSnapshot as any;
					const snapshotBefore = log.snapshotBefore ? JSON.parse(log.snapshotBefore) : null;
					const snapshotAfter = log.snapshotAfter ? JSON.parse(log.snapshotAfter) : null;

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
							: null,
						department: snapshotBefore?.department
							? {
									id: snapshotBefore.department.id,
									name: snapshotBefore.department.name,
							  }
							: snapshotAfter?.department
							? {
									id: snapshotAfter.department.id,
									name: snapshotAfter.department.name,
							  }
							: null,
						snapshotBefore,
						snapshotAfter,
						userSnapshot,
						departmentSnapshot,
						importLogId: log.importLogId,
					};
				});

				// Добавляем логи товаров к общему списку
				allLogs = [...allLogs, ...productLogs];
			}

			// Получаем данные пользователей для логов импорта
			if (isImportFilter || showAllActions) {
				const userIds = allLogs.map((log) => log.importLogData?.userId).filter((id) => id !== null && id !== undefined);

				if (userIds.length > 0) {
					const userWhere: any = { id: { in: userIds } };

					// Применяем фильтр по отделу к пользователям
					if (Object.keys(departmentFilter).length > 0) {
						userWhere.departmentId = departmentFilter.departmentId;
					}

					const users = await prisma.user.findMany({
						where: userWhere,
						select: {
							id: true,
							first_name: true,
							last_name: true,
							middle_name: true,
							phone: true,
							role: true,
							department: {
								select: { id: true, name: true },
							},
						},
					});

					const usersMap = new Map(users.map((user) => [user.id, user]));

					// Заполняем данные пользователей в логах импорта
					allLogs = allLogs.map((log) => {
						if (log.importLogData?.userId) {
							const user = usersMap.get(log.importLogData.userId);
							if (user) {
								// Для логов импорта используем отдел из departmentSnapshot, а не из user.department
								const importDepartment = log.departmentSnapshot
									? {
											id: log.departmentSnapshot.id,
											name: log.departmentSnapshot.name,
									  }
									: user.department;

								log.admin = {
									id: user.id,
									first_name: user.first_name,
									last_name: user.last_name,
									middle_name: user.middle_name,
									phone: user.phone,
									role: user.role,
									department: importDepartment,
								};
							}
						}
						return log;
					});
				}
			}

			// Сортируем все логи по дате (новые сверху)
			allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

			// Фильтруем по действию если указан (кроме импорта, который уже обработан)
			if (action && action !== "all" && action !== "import") {
				allLogs = allLogs.filter((log) => log.action === action);
			}

			// Фильтрация по поиску администратора
			const adminSearch = searchParams.get("adminSearch");
			if (adminSearch && adminSearch.trim() !== "") {
				const searchTerm = adminSearch.trim().toLowerCase();
				allLogs = allLogs.filter((log) => {
					if (!log.admin) return false;

					// Поиск по ID (если введено число)
					if (!isNaN(Number(searchTerm)) && log.admin.id === parseInt(searchTerm)) {
						return true;
					}

					// Поиск по телефону
					if (log.admin.phone && log.admin.phone.toLowerCase().includes(searchTerm)) {
						return true;
					}

					// Поиск по ФИО
					const adminName = `${log.admin.last_name || ""} ${log.admin.first_name || ""} ${log.admin.middle_name || ""}`.trim().toLowerCase();
					if (adminName.includes(searchTerm)) {
						return true;
					}

					return false;
				});
			}

			// Фильтрация по конкретному продукту (targetProductId)
			const targetProductId = searchParams.get("targetProductId");
			if (targetProductId) {
				const targetProductIdNum = parseInt(targetProductId);
				allLogs = allLogs.filter((log) => {
					// Проверяем targetProduct (snapshotAfter для созданных/обновленных продуктов)
					if (log.targetProduct && log.targetProduct.id === targetProductIdNum) {
						return true;
					}

					// Проверяем snapshotBefore для удаленных продуктов
					if (log.snapshotBefore && log.snapshotBefore.id === targetProductIdNum) {
						return true;
					}

					return false;
				});
			}

			// Фильтрация по поиску целевого продукта
			const targetProductSearch = searchParams.get("targetProductSearch");
			if (targetProductSearch && targetProductSearch.trim() !== "") {
				const searchTerm = targetProductSearch.trim().toLowerCase();

				if (isImportFilter) {
					// Для логов импорта ищем по товарам, которые были изменены при импорте
					allLogs = allLogs.filter((log) => {
						// Проверяем сообщение лога импорта
						if (log.message && log.message.toLowerCase().includes(searchTerm)) {
							return true;
						}

						// Проверяем данные импорта (snapshots)
						if (log.importLogData?.snapshots) {
							try {
								const snapshots = JSON.parse(log.importLogData.snapshots);
								if (Array.isArray(snapshots)) {
									for (const snapshot of snapshots) {
										if (
											snapshot.title?.toLowerCase().includes(searchTerm) ||
											snapshot.sku?.toLowerCase().includes(searchTerm) ||
											snapshot.brand?.toLowerCase().includes(searchTerm)
										) {
											return true;
										}
									}
								}
							} catch (e) {
								// Игнорируем ошибки парсинга
							}
						}

						return false;
					});
				} else {
					// Для обычных логов товаров
					// Получаем уникальные ID продуктов из логов для поиска их текущих данных
					const productIds = new Set<number>();
					allLogs.forEach((log) => {
						if (log.targetProduct?.id) {
							productIds.add(log.targetProduct.id);
						}
						if (log.snapshotBefore?.id) {
							productIds.add(log.snapshotBefore.id);
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

					allLogs = allLogs.filter((log) => {
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

						return false;
					});
				}
			}

			// Получаем общее количество отфильтрованных записей
			const total = allLogs.length;

			// Загружаем данные отделов для всех логов
			const departmentIds = new Set<number>();
			allLogs.forEach((log) => {
				if (log.department?.id) {
					departmentIds.add(log.department.id);
				}
			});

			let departmentsData: Map<number, { id: number; name: string }> = new Map();
			if (departmentIds.size > 0) {
				const departments = await prisma.department.findMany({
					where: { id: { in: Array.from(departmentIds) } },
					select: { id: true, name: true },
				});
				departmentsData = new Map(departments.map((dept) => [dept.id, dept]));
			}

			// Заполняем названия отделов в логах
			allLogs.forEach((log) => {
				if (log.department?.id) {
					const departmentData = departmentsData.get(log.department.id);
					if (departmentData) {
						log.department.name = departmentData.name;
					}
				}
			});

			// Применяем пагинацию к отфильтрованным данным
			const paginatedLogs = allLogs.slice(skip, skip + limit);

			const totalPages = Math.ceil(total / limit);

			return NextResponse.json({
				data: paginatedLogs,
				total,
				totalPages,
				currentPage: page,
			});
		} catch (err) {
			console.error("Ошибка при получении логов продуктов:", err);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_products_logs",
	["superadmin", "admin", "manager"]
);

// ✅ Удаление всех логов продуктов
export const DELETE = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			// Получаем параметры из запроса
			const { searchParams } = new URL(req.url);
			const confirm = searchParams.get("confirm");

			// Проверяем подтверждение удаления
			if (confirm !== "true") {
				return NextResponse.json({ error: "Для удаления всех логов продуктов необходимо подтверждение (confirm=true)" }, { status: 400 });
			}

			// Получаем количество логов продуктов перед удалением
			const logsCount = await prisma.changeLog.count({
				where: {
					entityType: "product",
				},
			});

			// Удаляем все логи продуктов
			const deleteResult = await prisma.changeLog.deleteMany({
				where: {
					entityType: "product",
				},
			});

			return NextResponse.json({
				success: true,
				message: `Успешно удалено ${deleteResult.count} логов продуктов`,
				deletedCount: deleteResult.count,
				totalBeforeDeletion: logsCount,
			});
		} catch (error) {
			console.error("❌ Ошибка при удалении логов продуктов:", error);
			return NextResponse.json({ error: "Ошибка при удалении логов продуктов" }, { status: 500 });
		}
	},
	"view_products_logs", // ✅ Разрешение на управление логами продуктов
	["superadmin"] // ✅ Только суперадмин может удалять все логи
);
