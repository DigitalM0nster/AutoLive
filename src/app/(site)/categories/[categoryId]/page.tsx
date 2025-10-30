// src\app\categories\[categoryId]\page.tsx

import { Suspense } from "react";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import CONFIG from "@/lib/config";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CategoryContent from "./CategoryContent";
import CategorySkeleton from "./CategorySkeleton";

type PageParams = {
	params: Promise<{
		categoryId: string;
	}>;
};

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
	try {
		const { categoryId } = await params;
		const id = parseInt(categoryId);

		if (isNaN(id)) {
			return {
				title: `Категория товаров в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
				description: `Широкий выбор товаров в ${CONFIG.CITY}. Доставка по ${CONFIG.CITY} и всей России.`,
			};
		}

		// Загружаем данные категории напрямую из базы данных
		// Используем только нужные поля для метаданных (не нужно загружать все товары)
		const category = await prisma.category.findUnique({
			where: { id },
			select: {
				title: true,
			},
		});

		if (!category) {
			return {
				title: `Категория товаров в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
				description: `Широкий выбор товаров в ${CONFIG.CITY}. Доставка по ${CONFIG.CITY} и всей России.`,
			};
		}

		const { CITY, STORE_NAME, DOMAIN } = CONFIG;

		return {
			title: `${category.title} в ${STORE_NAME} | ${CITY}`,
			description: `Широкий выбор ${category.title.toLowerCase()} в ${CITY}. Доставка по ${CITY} и всей России. Надежный магазин автозапчастей – ${STORE_NAME} (${DOMAIN}).`,
			keywords: `${category.title} ${CITY}, автозапчасти ${CITY}, ${category.title.toLowerCase()}, ${STORE_NAME}, ${DOMAIN}`,
		};
	} catch (error) {
		console.error("Ошибка при генерации метаданных:", error);
		return {
			title: `Категория товаров в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
			description: `Широкий выбор товаров в ${CONFIG.CITY}. Доставка по ${CONFIG.CITY} и всей России.`,
		};
	}
}

export default async function CategoryPage({ params }: PageParams) {
	const { categoryId } = await params;

	if (!categoryId) {
		return <div className="text-center">Загрузка...</div>;
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu productId={undefined} />

				{/* Секция с контентом категории с использованием Suspense для скелетона */}
				<Suspense fallback={<CategorySkeleton />}>
					<CategoryContent categoryId={categoryId} />
				</Suspense>
			</div>
		</div>
	);
}
