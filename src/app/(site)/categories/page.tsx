// src\app\products\page.tsx

import Link from "next/link";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import CONFIG from "@/lib/config";
import type { Metadata } from "next";
import type { Category, Product } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
	try {
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
		const res = await fetch(`${baseUrl}/api/categories`, {
			next: { revalidate: 3600 },
		});

		if (!res.ok) {
			console.error(`Ошибка API: ${res.status} ${res.statusText}`);
			return {
				title: `Материалы для ТО в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
				description: `Широкий выбор материалов для ТО в ${CONFIG.CITY}. Доставка по ${CONFIG.CITY} и всей России.`,
			};
		}

		const categories = await res.json();

		if (!Array.isArray(categories)) {
			console.error("API вернул не массив:", categories);
			return {
				title: `Материалы для ТО в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
				description: `Широкий выбор материалов для ТО в ${CONFIG.CITY}. Доставка по ${CONFIG.CITY} и всей России.`,
			};
		}

		const { CITY, STORE_NAME, DOMAIN } = CONFIG;

		const categoryNamesWithCity = categories.map((cat: Category) => `${cat.title} ${CITY}`).join(", ");
		const categoryNames = categories.map((cat: Category) => cat.title).join(", ");

		return {
			title: `Материалы для ТО в ${STORE_NAME} | ${CITY}`,
			description: `Широкий выбор материалов для ТО: ${categoryNamesWithCity}. Доставка по ${CITY} и всей России. Надежный магазин автозапчастей – ${STORE_NAME} (${DOMAIN}).`,
			keywords: `${categoryNamesWithCity}, ${categoryNames}, автозапчасти ${CITY}, сервис ${CITY}, техническое обслуживание ${CITY}, ${STORE_NAME}, ${DOMAIN}`,
		};
	} catch (error) {
		console.error("Ошибка при генерации метаданных:", error);
		return {
			title: `Материалы для ТО в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
			description: `Широкий выбор материалов для ТО в ${CONFIG.CITY}. Доставка по ${CONFIG.CITY} и всей России.`,
		};
	}
}

export default async function CategoriesPage() {
	try {
		// Загружаем категории
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
		console.log("Base URL:", baseUrl);
		console.log("Full URL:", `${baseUrl}/api/categories`);

		const categoriesRes = await fetch(`${baseUrl}/api/categories`, {
			next: { revalidate: 3600 },
		});

		if (!categoriesRes.ok) {
			console.error(`Ошибка API категорий: ${categoriesRes.status} ${categoriesRes.statusText}`);
			throw new Error(`Ошибка API: ${categoriesRes.status}`);
		}

		// Загружаем все продукты через публичный API
		const productsRes = await fetch(`${baseUrl}/api/products/public`, {
			next: { revalidate: 3600 },
		});

		if (!productsRes.ok) {
			console.error(`Ошибка API продуктов: ${productsRes.status} ${productsRes.statusText}`);
			throw new Error(`Ошибка API: ${productsRes.status}`);
		}

		// Получаем текст ответа для диагностики
		const categoriesText = await categoriesRes.text();
		const productsText = await productsRes.text();
		console.log("Ответ API категорий (первые 200 символов):", categoriesText.substring(0, 200));
		console.log("Ответ API продуктов (первые 200 символов):", productsText.substring(0, 200));

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

		if (!Array.isArray(categories)) {
			console.error("API категорий вернул не массив:", categories);
			throw new Error("Неверный формат данных категорий");
		}

		return (
			<div className={`screen ${styles.screen}`}>
				<div className="screenContent">
					<NavigationMenu />
					<h1 className={`pageTitle ${styles.pageTitle}`}>Материалы для ТО</h1>

					{/* Секция с категориями */}
					<div className={`screenBlock ${styles.screenBlock}`}>
						{categories.length === 0 ? (
							<div className={styles.loading}>Загрузка...</div>
						) : (
							categories.map((category) => (
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
							))
						)}
					</div>
				</div>
			</div>
		);
	} catch (error) {
		console.error("Ошибка при загрузке страницы:", error);

		// Возвращаем страницу с ошибкой вместо падения
		return (
			<div className={`screen ${styles.screen}`}>
				<div className="screenContent">
					<NavigationMenu />
					<h1 className={`pageTitle ${styles.pageTitle}`}>Материалы для ТО</h1>
					<div className={`screenBlock ${styles.screenBlock}`}>
						<div className={styles.loading}>Произошла ошибка при загрузке данных. Пожалуйста, попробуйте позже.</div>
					</div>
				</div>
			</div>
		);
	}
}
