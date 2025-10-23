// src/app/api/categories/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const departmentId = searchParams.get("departmentId");

		// Получаем категории с количеством связанных фильтров
		let categories;
		if (departmentId) {
			// Если указан отдел, получаем только категории, доступные для этого отдела
			categories = await prisma.category.findMany({
				where: {
					allowedDepartments: {
						some: {
							departmentId: parseInt(departmentId),
						},
					},
				},
				select: {
					id: true,
					title: true,
					image: true,
					order: true,
					_count: {
						select: {
							Filter: true, // Подсчитываем количество фильтров
						},
					},
				},
				orderBy: { order: "asc" },
			});
		} else {
			// Если отдел не указан, получаем все категории
			categories = await prisma.category.findMany({
				select: {
					id: true,
					title: true,
					image: true,
					order: true,
					_count: {
						select: {
							Filter: true, // Подсчитываем количество фильтров
						},
					},
				},
				orderBy: { order: "asc" },
			});
		}

		// Преобразуем данные в нужный формат, включая поле order
		const formattedCategories = categories.map((category) => ({
			id: category.id,
			title: category.title,
			image: category.image,
			order: category.order, // Добавляем поле order в ответ
			filtersCount: category._count.Filter,
		}));

		return NextResponse.json(formattedCategories);
	} catch (error) {
		console.error("Ошибка при получении категорий:", error);

		// Специальная обработка ошибок подключения к базе данных
		if (error instanceof Error) {
			if (error.message.includes("connection pool") || error.message.includes("P1017")) {
				console.error("Проблема с пулом соединений базы данных");
				return NextResponse.json(
					{
						error: "Временная проблема с подключением к базе данных. Попробуйте позже.",
					},
					{ status: 503 }
				); // 503 Service Unavailable
			}

			if (error.message.includes("timeout")) {
				console.error("Таймаут подключения к базе данных");
				return NextResponse.json(
					{
						error: "Превышено время ожидания подключения к базе данных.",
					},
					{ status: 504 }
				); // 504 Gateway Timeout
			}
		}

		return NextResponse.json({ error: "Ошибка при получении категорий" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const title = formData.get("title") as string;
		const imageFile = formData.get("image") as File | null;
		const filtersJson = formData.get("filters") as string;

		if (!title || !title.trim()) {
			return NextResponse.json({ error: "Название категории обязательно" }, { status: 400 });
		}

		// Получаем максимальный порядок для установки нового
		const maxOrder = await prisma.category.aggregate({
			_max: { order: true },
		});

		const newOrder = (maxOrder._max.order || 0) + 1;

		// Создаем категорию с фильтрами в транзакции
		const result = await prisma.$transaction(async (tx) => {
			// Создаем категорию
			const category = await tx.category.create({
				data: {
					title: title.trim(),
					order: newOrder,
					// Пока не добавляем изображение, нужно реализовать загрузку файлов
				},
			});

			// Обрабатываем фильтры если они есть
			if (filtersJson) {
				try {
					const filters = JSON.parse(filtersJson);

					// Создаем фильтры для новой категории
					for (const filter of filters) {
						if (filter.title && filter.title.trim()) {
							const newFilter = await tx.filter.create({
								data: {
									title: filter.title.trim(),
									type: filter.type as "select" | "multi_select" | "range" | "boolean",
									categoryId: category.id,
								},
							});

							// Создаем значения для фильтра
							if (filter.values && filter.values.length > 0) {
								for (const value of filter.values) {
									if (value.value && value.value.trim()) {
										await tx.filterValue.create({
											data: {
												value: value.value.trim(),
												filterId: newFilter.id,
											},
										});
									}
								}
							}
						}
					}
				} catch (parseError) {
					console.error("Ошибка при парсинге фильтров:", parseError);
					// Не прерываем выполнение, если фильтры не удалось распарсить
				}
			}

			return category;
		});

		// Возвращаем созданную категорию с фильтрами
		const createdCategory = await prisma.category.findUnique({
			where: { id: result.id },
			include: {
				Filter: {
					include: {
						values: true,
					},
				},
			},
		});

		return NextResponse.json(createdCategory);
	} catch (error) {
		console.error("Ошибка при создании категории:", error);

		// Специальная обработка ошибок подключения к базе данных
		if (error instanceof Error) {
			if (error.message.includes("connection pool") || error.message.includes("P1017")) {
				console.error("Проблема с пулом соединений базы данных");
				return NextResponse.json(
					{
						error: "Временная проблема с подключением к базе данных. Попробуйте позже.",
					},
					{ status: 503 }
				); // 503 Service Unavailable
			}

			if (error.message.includes("timeout")) {
				console.error("Таймаут подключения к базе данных");
				return NextResponse.json(
					{
						error: "Превышено время ожидания подключения к базе данных.",
					},
					{ status: 504 }
				); // 504 Gateway Timeout
			}
		}

		return NextResponse.json({ error: "Ошибка при создании категории" }, { status: 500 });
	}
}
