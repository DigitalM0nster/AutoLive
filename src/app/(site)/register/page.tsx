// src\app\register\page.tsx

import styles from "./styles.module.scss";
import RegisterContent from "./RegisterContent";
import CONFIG from "@/lib/config"; // 🔥 Подключаем конфиг
import { Metadata } from "next"; // 👈 импорт типа для метаданных

// ✅ Динамическое создание метаданных
export const metadata: Metadata = {
	title: `Регистрация в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
	description: `Пройдите быструю регистрацию в ${CONFIG.STORE_NAME} и получите доступ к лучшим автозапчастям, ТО и сервисам в ${CONFIG.CITY}. Удобный и быстрый процесс на ${CONFIG.DOMAIN}.`,
	keywords: `регистрация ${CONFIG.CITY}, создать аккаунт, автозапчасти ${CONFIG.CITY}, сервис ${CONFIG.CITY}, ${CONFIG.STORE_NAME}, ${CONFIG.DOMAIN}`,
};

export default function RegisterPage() {
	return (
		<div className={`screen ${styles.screen}`}>
			<div className={`screenContent ${styles.screenContent}`}>
				<h1 className={`pageTitle ${styles.pageTitle}`}>Регистрация</h1>
				<div className={`screenBlock ${styles.screenBlock}`}>
					<RegisterContent />
				</div>
			</div>
		</div>
	);
}
