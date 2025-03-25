// src\app\contacts\page.tsx

import NavigationMenu from "@/components/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import CONFIG from "@/lib/config"; // 🔥 Подключаем конфиг

// ✅ Динамическое создание метаданных
export const metadata = {
	title: `Контакты | ${CONFIG.STORE_NAME} ${CONFIG.CITY}`,
	description: `Свяжитесь с нами! Адрес, телефон и режим работы ${CONFIG.STORE_NAME} в ${CONFIG.CITY}. Быстрая обратная связь на ${CONFIG.DOMAIN}.`,
	keywords: `контакты ${CONFIG.STORE_NAME}, телефон ${CONFIG.STORE_NAME}, адрес ${CONFIG.CITY}, автосервис ${CONFIG.CITY}, как доехать ${CONFIG.STORE_NAME}, ${CONFIG.DOMAIN}`,
};

export default function Contacts() {
	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<div className={`screenBlock ${styles.screenBlock}`}></div>
			</div>
		</div>
	);
}
