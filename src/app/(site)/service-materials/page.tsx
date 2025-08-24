// src\app\service-materials\page.tsx

import Link from "next/link";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import CONFIG from "@/lib/config";
import type { Metadata } from "next";
import type { Category } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
	try {
		const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories`, {
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

export default async function ServiceMaterials() {
	try {
		// Проверяем, что переменная окружения установлена
		if (!process.env.NEXT_PUBLIC_BASE_URL) {
			console.error("NEXT_PUBLIC_BASE_URL не установлена");
			throw new Error("Конфигурация не найдена");
		}

		const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories`, {
			next: { revalidate: 3600 },
		});

		if (!res.ok) {
			console.error(`Ошибка API: ${res.status} ${res.statusText}`);
			throw new Error(`Ошибка API: ${res.status}`);
		}

		// Получаем текст ответа для диагностики
		const responseText = await res.text();
		console.log("Ответ API (первые 200 символов):", responseText.substring(0, 200));

		let categories: Category[];
		try {
			categories = JSON.parse(responseText);
		} catch (parseError) {
			console.error("Ошибка парсинга JSON:", parseError);
			console.error("Полный ответ API:", responseText);
			throw new Error("Неверный формат ответа API");
		}

		if (!Array.isArray(categories)) {
			console.error("API вернул не массив:", categories);
			throw new Error("Неверный формат данных");
		}

		return (
			<div className={`screen ${styles.screen}`}>
				<div className="screenContent">
					<NavigationMenu />
					<h1 className={`pageTitle ${styles.pageTitle}`}>Материалы для ТО</h1>
					<div className={`screenBlock ${styles.screenBlock}`}>
						{categories.length === 0 ? (
							<div className={styles.loading}>Загрузка...</div>
						) : (
							categories.map((category) => (
								<Link href={`/service-materials/${category.id}`} key={category.id} className={styles.categoryItem}>
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
