import styles from "./styles.module.scss";
import CONFIG from "@/lib/config";
import HomePageClient from "./HomePageClient";

// ✅ Динамическая генерация метаданных
export async function generateMetadata() {
	return {
		title: `Главная | ${CONFIG.STORE_NAME} ${CONFIG.CITY}`,
		description: `Купите автозапчасти, материалы для ТО и записывайтесь на обслуживание в ${CONFIG.STORE_NAME}. Лучшие цены, доставка в ${CONFIG.CITY} и по всей России!`,
		keywords: `автозапчасти, ТО, комплект ТО, купить запчасти ${CONFIG.CITY}, ${CONFIG.STORE_NAME}, ${CONFIG.DOMAIN}`,
	};
}

// ✅ Главная страница
export default function Home() {
	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<HomePageClient />
			</div>
		</div>
	);
}
