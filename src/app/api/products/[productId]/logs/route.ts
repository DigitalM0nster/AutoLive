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
			// Получаем productId из URL
			const productId = Number(req.nextUrl.pathname.split("/")[3]); // /api/products/[productId]/logs

			if (isNaN(productId)) {
				return NextResponse.json({ error: "Некорректный ID продукта" }, { status: 400 });
			}

			// Проверяем существование продукта
			const targetProduct = await prisma.product.findUnique({
				where: { id: productId },
				select: {
					id: true,
					title: true,
					sku: true,
					brand: true,
					price: true,
					category: {
						select: { id: true, title: true },
					},
					department: {
						select: { id: true, name: true },
					},
				},
			});

			if (!targetProduct) {
				return NextResponse.json({ error: "Продукт не найден" }, { status: 404 });
			}

			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "10", 10);
			const skip = (page - 1) * limit;

			// Строим условия фильтрации для логов конкретного продукта
			const where: any = {
				product_id: productId, // Фильтруем по конкретному продукту
			};

			// Фильтр по действию
			const action = searchParams.get("action");
			if (action && action !== "all") {
				where.action = action;
			}

			// Фильтр по дате
			const startDate = searchParams.get("startDate");
			const endDate = searchParams.get("endDate");
			if (startDate || endDate) {
				where.created_at = {};
				if (startDate) {
					where.created_at.gte = new Date(startDate);
				}
				if (endDate) {
					where.created_at.lte = new Date(endDate + "T23:59:59.999Z");
				}
			}

			// Получаем логи продукта из таблицы product_log
			const logs = await prisma.product_log.findMany({
				where,
				orderBy: {
					created_at: "desc",
				},
			});

			// Преобразуем логи в нужный формат
			const formattedLogs = logs.map((log) => {
				// Парсим JSON данные из снимков
				const userSnapshot = log.user_snapshot as any;
				const departmentSnapshot = log.department_snapshot as any;
				const snapshotBefore = log.snapshot_before ? JSON.parse(log.snapshot_before) : null;
				const snapshotAfter = log.snapshot_after ? JSON.parse(log.snapshot_after) : null;

				return {
					id: log.id,
					createdAt: log.created_at,
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
					importLogId: log.import_log_id, // Добавляем ссылку на лог импорта
				};
			});

			// Фильтрация по поиску администратора
			const adminSearch = searchParams.get("adminSearch");
			let filteredLogs = formattedLogs;
			if (adminSearch && adminSearch.trim() !== "") {
				const searchTerm = adminSearch.trim().toLowerCase();
				filteredLogs = formattedLogs.filter((log) => {
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

			// Получаем общее количество отфильтрованных записей
			const total = filteredLogs.length;
			// Применяем пагинацию к отфильтрованным данным
			const paginatedLogs = filteredLogs.slice(skip, skip + limit);

			const totalPages = Math.ceil(total / limit);

			return NextResponse.json({
				data: paginatedLogs,
				total,
				totalPages,
				currentPage: page,
				targetProduct: {
					id: targetProduct.id,
					title: targetProduct.title,
					sku: targetProduct.sku,
					brand: targetProduct.brand,
					price: targetProduct.price,
					category: targetProduct.category,
					department: targetProduct.department,
				},
			});
		} catch (err) {
			console.error("Ошибка при получении логов продукта:", err);
			return NextResponse.json(
				{
					error: "Ошибка сервера при получении логов продукта",
					details: err instanceof Error ? err.message : "Неизвестная ошибка",
				},
				{ status: 500 }
			);
		}
	},
	"view_products_logs", // Разрешение на просмотр логов продуктов
	["admin", "superadmin"]
);
