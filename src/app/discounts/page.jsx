import Link from "next/link";
import NavigationMenu from "../../components/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import CONFIG from "@/app/lib/config";

// ✅ Динамическое создание метаданных
export const metadata = {
	title: `Скидки и акции в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
	description: `Актуальные скидки на автозапчасти и техническое обслуживание в ${CONFIG.STORE_NAME} (${CONFIG.CITY}). Успейте воспользоваться выгодными предложениями на ${CONFIG.DOMAIN}.`,
	keywords: `скидки на автозапчасти ${CONFIG.CITY}, акции ${CONFIG.STORE_NAME}, ТО со скидкой ${CONFIG.CITY}, автосервис ${CONFIG.CITY}, ${CONFIG.DOMAIN}`,
};

// Загружаем данные **один раз на билде, но обновляем раз в 1 час**
async function getDiscounts() {
	const res = await fetch("http://localhost:3000/api/discounts", {
		next: { revalidate: 3600 }, // Обновление раз в 1 час
	});
	const discounts = await res.json();
	return discounts;
}

// **Статическая генерация (SSG)**
export default async function Discounts() {
	const discounts = await getDiscounts(); // Загружаем скидки с API

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<h1 className={`pageTitle ${styles.pageTitle}`}>Акции</h1>
				<div className={`screenBlock ${styles.screenBlock}`}>
					{discounts.length === 0 ? (
						<div className={styles.loading}>Загрузка...</div>
					) : (
						discounts.map((discount) => (
							<div key={discount.id} className={styles.discountItem}>
								<div className={styles.photo}>
									<img src={discount.image} alt={discount.title} />
								</div>
								<div className={styles.contentBlock}>
									<div className={styles.textContent}>
										<div className={styles.title}>{discount.title}</div>
										<div className={styles.description}>{discount.description}</div>
									</div>
									<Link href="/service-booking" className={`button ${styles.button}`}>
										Записаться на ТО
									</Link>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
