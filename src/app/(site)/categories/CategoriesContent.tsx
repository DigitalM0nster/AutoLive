import Link from "next/link";
import styles from "./styles.module.scss";
import type { Category, Product } from "@/lib/types";

// Функция для загрузки данных категорий
// Вынесена отдельно для лучшей читаемости и тестируемости
async function loadCategoriesData(): Promise<{ categories: Category[]; products: Product[] }> {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
	console.log("Base URL:", baseUrl);
	console.log("Full URL:", `${baseUrl}/api/categories`);

	// Загружаем категории
	const categoriesRes = await fetch(`${baseUrl}/api/categories`, {
		next: { revalidate: 3600 },
	});

	if (!categoriesRes.ok) {
		console.error(`Ошибка API категорий: ${categoriesRes.status} ${categoriesRes.statusText}`);
		throw new Error(`Ошибка API категорий: ${categoriesRes.status}`);
	}

	// Загружаем все продукты через публичный API
	const productsRes = await fetch(`${baseUrl}/api/products/public`, {
		next: { revalidate: 3600 },
	});

	if (!productsRes.ok) {
		console.error(`Ошибка API продуктов: ${productsRes.status} ${productsRes.statusText}`);
		throw new Error(`Ошибка API продуктов: ${productsRes.status}`);
	}

	// Получаем текст ответа для диагностики
	const categoriesText = await categoriesRes.text();
	const productsText = await productsRes.text();
	console.log("Ответ API категорий (первые 200 символов):", categoriesText.substring(0, 200));
	console.log("Ответ API продуктов (первые 200 символов):", productsText.substring(0, 200));

	// Парсим JSON данные
	let categories: Category[];
	let products: Product[];

	try {
		categories = JSON.parse(categoriesText);
		const productsData = JSON.parse(productsText);

		// API продуктов возвращает объект с products массивом
		if (productsData && Array.isArray(productsData.products)) {
			products = productsData.products;
		} else {
			console.error("API продуктов вернул неверную структуру:", productsData);
			throw new Error("Неверный формат данных продуктов");
		}
	} catch (parseError) {
		console.error("Ошибка парсинга JSON:", parseError);
		console.error("Полный ответ API категорий:", categoriesText);
		console.error("Полный ответ API продуктов:", productsText);
		throw new Error("Неверный формат ответа API");
	}

	// Проверяем валидность данных
	if (!Array.isArray(categories)) {
		console.error("API категорий вернул не массив:", categories);
		throw new Error("Неверный формат данных категорий");
	}

	return { categories, products };
}

// Компонент для отображения списка категорий
// Чистый компонент без логики загрузки данных
function CategoriesList({ categories }: { categories: Category[] }) {
	if (categories.length === 0) {
		return <div className={styles.loading}>Загрузка...</div>;
	}

	return (
		<>
			{categories.map((category) => (
				<Link href={`/categories/${category.id}`} key={category.id} className={styles.categoryItem}>
					<div className={styles.categoryTitleBlock}>
						<h2 className={styles.title}>{category.title}</h2>
						<div className={styles.button}>Перейти →</div>
					</div>
					<div className={styles.categoryImageBlock}>
						<div className={styles.background} />
						<div className={styles.image}>{category.image && <img src={category.image} alt={category.title} />}</div>
					</div>
				</Link>
			))}
		</>
	);
}

// Компонент для отображения ошибки
function ErrorMessage({ message }: { message: string }) {
	return <div className={styles.loading}>{message}</div>;
}

// Основной компонент для отображения контента категорий
// Вынесен в отдельный компонент для работы с Suspense
export default async function CategoriesContent() {
	// Загружаем данные
	const data = await loadCategoriesData();

	// Рендерим контент
	return (
		<div className={`screenBlock ${styles.screenBlock}`}>
			<CategoriesList categories={data.categories} />
		</div>
	);
}
