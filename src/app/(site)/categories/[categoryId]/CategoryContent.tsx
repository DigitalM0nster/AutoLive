import styles from "./styles.module.scss";
import CategoryPageClient from "./CategoryPageClient";
import type { Category } from "@/lib/types";

// Функция для загрузки данных категории с retry логикой
// Вынесена отдельно для лучшей читаемости и тестируемости
async function loadCategoryData(categoryId: string, retries = 3): Promise<any> {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			// Загружаем данные категории с товарами и фильтрами параллельно
			const [categoryRes, filtersRes] = await Promise.allSettled([
				fetch(`${baseUrl}/api/products/get-products-by-category?category=${categoryId}`, {
					next: { revalidate: 3600 },
				}),
				fetch(`${baseUrl}/api/categories/${categoryId}/filters/public`, {
					next: { revalidate: 3600 },
				}),
			]);

			// Проверяем основной запрос категории
			if (categoryRes.status === "rejected" || !categoryRes.value.ok) {
				if (attempt === retries) {
					throw new Error(`Ошибка загрузки данных категории: ${categoryRes.value?.status || "Network error"}`);
				}
				// Ждем перед повторной попыткой
				await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
				continue;
			}

			const categoryData = await categoryRes.value.json();

			if (!categoryData || !categoryData.category) {
				throw new Error("Неверный формат данных категории");
			}

			// Обрабатываем фильтры (не критично)
			let filters = [];
			if (filtersRes.status === "fulfilled" && filtersRes.value.ok) {
				try {
					filters = await filtersRes.value.json();
				} catch (filterError) {
					console.warn("Не удалось распарсить фильтры:", filterError);
				}
			}

			// Добавляем фильтры к данным категории
			const categoryDataWithFilters = {
				...categoryData,
				category: {
					...categoryData.category,
					filters: filters,
				},
			};

			return categoryDataWithFilters;
		} catch (error) {
			if (attempt === retries) {
				throw error;
			}
			// Ждем перед повторной попыткой
			await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
		}
	}
}

// Компонент для отображения контента страницы категории
// Вынесен в отдельный компонент для работы с Suspense
export default async function CategoryContent({ categoryId }: { categoryId: string }) {
	try {
		// Загружаем данные
		const categoryData = await loadCategoryData(categoryId);

		// Рендерим контент
		return (
			<>
				<h1 className={`pageTitle ${styles.pageTitle}`}>{categoryData.category.title}</h1>
				<CategoryPageClient categoryData={categoryData} />
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
