import Link from "next/link";
import NavigationMenu from "@/components/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import { getCategories } from "@/app/lib/api";
import CONFIG from "@/app/lib/config"; // 🔥 Подключаем конфиг

// ✅ Динамическое создание метаданных
export async function generateMetadata() {
	const categories = await getCategories();
	const city = CONFIG.CITY;
	const storeName = CONFIG.STORE_NAME;
	const domain = CONFIG.DOMAIN;

	// Получаем список категорий с городом
	const categoryNamesWithCity = categories.map((cat) => `${cat.name} ${city}`).join(", ");
	const categoryNames = categories.map((cat) => cat.name).join(", ");

	return {
		title: `Материалы для ТО в ${storeName} | ${city}`,
		description: `Широкий выбор материалов для ТО: ${categoryNamesWithCity}. Доставка по ${city} и всей России. Надежный магазин автозапчастей – ${storeName} (${domain}).`,
		keywords: `${categoryNamesWithCity}, ${categoryNames}, автозапчасти ${city}, сервис ${city}, техническое обслуживание ${city}, ${storeName}, ${domain}`,
	};
}

// ✅ SSG (статическая страница)
export default async function ServiceMaterials() {
	const categories = await getCategories();

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
							<Link href={`/service-materials/${category.id.toString()}`} key={category.id} className={styles.categoryItem}>
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
