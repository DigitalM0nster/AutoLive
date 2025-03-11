import styles from "./styles.module.scss";
import NavigationMenu from "../../components/navigationMenu/NavigationMenu";
import CONFIG from "@/app/lib/config"; // 🔥 Подключаем конфиг
import ServiceBookingContent from "./ServiceBookingContent";

// ✅ Динамическое создание метаданных
export async function generateMetadata() {
	const city = CONFIG.CITY; // 🔥 Добавляем город
	const storeName = CONFIG.STORE_NAME;
	const domain = CONFIG.DOMAIN;

	return {
		title: `Запись на ТО в ${storeName} | ${city}`,
		description: `Запишитесь на техническое обслуживание в ${storeName} (${domain}). Удобный выбор даты и времени, качественное ТО в ${city}.`,
		keywords: `запись на ТО ${city}, техобслуживание ${city}, сервисное обслуживание ${city}, автосервис ${city}, ${storeName}, ${domain}`,
	};
}

export default function ServiceBooking() {
	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<h1 className={`pageTitle ${styles.pageTitle}`}>Запись на ТО</h1>
				<div className={`screenBlock ${styles.screenBlock}`}>
					<ServiceBookingContent />
				</div>
			</div>
		</div>
	);
}
