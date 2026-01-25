// src\app\categories\page.tsx

import { Suspense } from "react";

// Не статически генерируем при build — метаданные и контент запрашивают API (для Vercel и локального build)
export const dynamic = "force-dynamic";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import CONFIG from "@/lib/config";
import type { Metadata } from "next";
import type { Category } from "@/lib/types";
import CategoriesContent from "./CategoriesContent";
import CategoriesSkeleton from "./CategoriesSkeleton";

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
	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<h1 className={`pageTitle ${styles.pageTitle}`}>Материалы для ТО</h1>

				{/* Секция с категориями с использованием Suspense для скелетона */}
				<Suspense fallback={<CategoriesSkeleton />}>
					<CategoriesContent />
				</Suspense>
			</div>
		</div>
	);
}
