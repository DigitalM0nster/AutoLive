// src\app\service-materials\page.tsx

import Link from "next/link";
import NavigationMenu from "@/components/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import { getCategories } from "@/lib/api";
import CONFIG from "@/lib/config";
import type { Metadata } from "next";
import { Category } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
	const categories = await getCategories();
	const { CITY, STORE_NAME, DOMAIN } = CONFIG;

	const categoryNamesWithCity = categories.map((cat) => `${cat.name} ${CITY}`).join(", ");
	const categoryNames = categories.map((cat) => cat.name).join(", ");

	return {
		title: `Материалы для ТО в ${STORE_NAME} | ${CITY}`,
		description: `Широкий выбор материалов для ТО: ${categoryNamesWithCity}. Доставка по ${CITY} и всей России. Надежный магазин автозапчастей – ${STORE_NAME} (${DOMAIN}).`,
		keywords: `${categoryNamesWithCity}, ${categoryNames}, автозапчасти ${CITY}, сервис ${CITY}, техническое обслуживание ${CITY}, ${STORE_NAME}, ${DOMAIN}`,
	};
}

export default async function ServiceMaterials() {
	const categories: Category[] = await getCategories();

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
									<h2 className={styles.title}>{category.name}</h2>
									<div className={styles.button}>Перейти →</div>
								</div>
								<div className={styles.categoryImageBlock}>
									<div className={styles.background} />
									<div className={styles.image}>
										<img src={category.image_url} alt={category.name} />
									</div>
								</div>
							</Link>
						))
					)}
				</div>
			</div>
		</div>
	);
}
