import NavigationMenu from "../../components/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import CONFIG from "@/app/lib/config"; // 🔥 Подключаем конфиг

// ✅ Динамическое создание метаданных
export const metadata = {
	title: `Каталог автозапчастей | ${CONFIG.STORE_NAME} ${CONFIG.CITY}`,
	description: `Большой выбор автозапчастей и аксессуаров в ${CONFIG.STORE_NAME}. Доставка по ${CONFIG.CITY} и всей России. Найдите нужные детали для вашего автомобиля на ${CONFIG.DOMAIN}.`,
	keywords: `каталог автозапчастей, автозапчасти ${CONFIG.CITY}, купить автозапчасти, запчасти для авто, магазин автозапчастей ${CONFIG.STORE_NAME}, ${CONFIG.DOMAIN}`,
};

export default function Catalog() {
	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<div className={`screenBlock ${styles.screenBlock}`}></div>
			</div>
		</div>
	);
}
