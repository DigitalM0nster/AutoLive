// src/app/api/categories/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, validateFile } from "@/lib/simpleFileUpload";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
	try {
		const { categoryId: id } = await params; // Ожидаем params перед использованием
		const categoryId = Number(id);
		const formData = await request.formData();
		const title = formData.get("title") as string;
		const imageFile = formData.get("image") as File | null;
		const filtersJson = formData.get("filters") as string;

		if (!title || !title.trim()) {
			return NextResponse.json({ error: "Название категории обязательно" }, { status: 400 });
		}

		// Подготавливаем данные для обновления категории
		const updateData: any = {
			title: title.trim(),
		};

		// Обрабатываем загрузку изображения
		if (imageFile && imageFile.size > 0) {
			// Валидируем файл
			const validation = validateFile(imageFile);
			if (!validation.isValid) {
				return NextResponse.json({ error: validation.error }, { status: 400 });
			}

			// Загружаем изображение
			const uploadResult = await uploadFile(imageFile, {
				prefix: "category",
				entityId: categoryId,
			});

			updateData.image = uploadResult.url;
		}

		// Начинаем транзакцию для обновления категории и фильтров
		const result = await prisma.$transaction(async (tx) => {
			// Обновляем категорию
			const category = await tx.category.update({
				where: { id: categoryId },
				data: updateData,
			});

			// Обрабатываем фильтры если они есть
			if (filtersJson) {
				try {
					const filters = JSON.parse(filtersJson);

					// Удаляем все существующие фильтры для этой категории
					// Сначала удаляем связи с товарами
					await tx.productFilterValue.deleteMany({
						where: {
							filterValue: {
								filter: {
									categoryId: categoryId,
								},
							},
						},
					});

					// Потом удаляем значения фильтров
					await tx.filterValue.deleteMany({
						where: {
							filter: {
								categoryId: categoryId,
							},
						},
					});

					// И наконец удаляем сами фильтры
					await tx.filter.deleteMany({
						where: { categoryId: categoryId },
					});

					// Создаем новые фильтры
					for (const filter of filters) {
						if (filter.title && filter.title.trim()) {
							const newFilter = await tx.filter.create({
								data: {
									title: filter.title.trim(),
									type: filter.type || "select",
									unit: filter.unit || null, // Добавляем единицу измерения
									categoryId: categoryId,
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

		// Возвращаем обновленную категорию с фильтрами
		const updatedCategory = await prisma.category.findUnique({
			where: { id: categoryId },
			include: {
				Filter: {
					include: {
						values: true,
					},
				},
			},
		});

		return NextResponse.json(updatedCategory);
	} catch (error) {
		console.error("Ошибка при обновлении категории:", error);
		return NextResponse.json({ error: "Ошибка при обновлении категории" }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
	try {
		const { categoryId: id } = await params; // Ожидаем params перед использованием
		const categoryId = Number(id);

		// Получаем информацию о том, что будет удалено
		const category = await prisma.category.findUnique({
			where: { id: categoryId },
			include: {
				_count: {
					select: {
						products: true,
						allowedDepartments: true,
					},
				},
			},
		});

		if (!category) {
			return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
		}

		// Удаляем категорию (каскадно удалятся все связанные данные)
		await prisma.category.delete({
			where: { id: categoryId },
		});

		return NextResponse.json({
			message: "Категория успешно удалена",
			deletedProducts: category._count.products,
			deletedDepartments: category._count.allowedDepartments,
		});
	} catch (error) {
		console.error("Ошибка при удалении категории:", error);
		return NextResponse.json({ error: "Ошибка при удалении категории" }, { status: 500 });
	}
}
