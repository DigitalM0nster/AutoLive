import styles from "./styles.module.scss";
import CategoryPageClient from "./CategoryPageClient";
import { prisma } from "@/lib/prisma";

// Функция для загрузки данных категории напрямую из базы данных
// Используем Prisma напрямую вместо HTTP-запросов к API
// Это намного быстрее, так как нет лишнего HTTP-круга через сеть
async function loadCategoryData(categoryId: string) {
	const id = parseInt(categoryId);

	if (isNaN(id)) {
		throw new Error("Некорректный ID категории");
	}

	// Загружаем данные категории с товарами и фильтрами параллельно
	// Используем Promise.all для одновременной загрузки всех данных
	const [category, filters] = await Promise.all([
		// Получаем категорию со всеми товарами и их фильтрами
		prisma.category.findUnique({
			where: { id },
			include: {
				products: {
					include: {
						productFilterValues: {
							include: {
								filterValue: {
									include: { filter: true },
								},
							},
						},
					},
				},
			},
		}),
		// Получаем фильтры категории с их значениями
		prisma.filter.findMany({
			where: { categoryId: id },
			include: {
				values: {
					orderBy: { value: "asc" },
				},
			},
			orderBy: { id: "asc" },
		}),
	]);

	if (!category) {
		throw new Error("Категория не найдена");
	}

	// Преобразуем данные товаров: удаляем supplierPrice и форматируем фильтры
	// Это такая же логика, как была в API endpoint
	const sanitizedProducts = category.products.map((product) => {
		const { supplierPrice, productFilterValues, ...rest } = product;

		// Преобразуем productFilterValues в формат filters
		const filters = productFilterValues.map((pfv) => ({
			filterId: pfv.filterValue.filterId,
			valueId: pfv.filterValueId,
			value: pfv.filterValue.value,
			filter: pfv.filterValue.filter,
		}));

		return {
			...rest,
			filters,
		};
	});

	// Форматируем фильтры категории в нужный формат
	const formattedFilters = filters.map((filter) => ({
		id: filter.id,
		title: filter.title,
		type: filter.type,
		unit: filter.unit,
		values: filter.values.map((value) => ({
			id: value.id,
			value: value.value,
		})),
	}));

	// Возвращаем данные в том же формате, что и API
	return {
		category: {
			...category,
			products: sanitizedProducts,
			filters: formattedFilters,
		},
	};
}

// Компонент для отображения контента страницы категории
export default async function CategoryContent({ categoryId }: { categoryId: string }) {
	try {
		// Загружаем данные напрямую из базы данных
		const categoryData = await loadCategoryData(categoryId);
		// ВАЖНО: преобразуем данные к сериализуемому виду для передачи в client-компонент
		// Prisma может возвращать типы (например, Decimal), которые не сериализуются в props
		const clientSafeCategoryData = JSON.parse(JSON.stringify(categoryData));

		// Рендерим контент
		return (
			<>
				<h1 className={`pageTitle ${styles.pageTitle}`}>{categoryData.category.title}</h1>
				<CategoryPageClient categoryData={clientSafeCategoryData} />
			</>
		);
	} catch (error) {
		console.error("Ошибка при загрузке данных категории:", error);

		// Возвращаем страницу с ошибкой
		return (
			<>
				<h1 className={`pageTitle ${styles.pageTitle}`}>Ошибка загрузки</h1>
				<div className={styles.materialContainer}>
					<div className={styles.block}>
						<div style={{ padding: "20px", textAlign: "center", color: "#666" }}>Произошла ошибка при загрузке данных категории. Пожалуйста, попробуйте позже.</div>
					</div>
				</div>
			</>
		);
	}
}
