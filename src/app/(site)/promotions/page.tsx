import Link from "next/link";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import CONFIG from "@/lib/config";
import { Promotion } from "@/lib/types"; // ✅ Добавим тип

export const metadata = {
	title: `Скидки и акции в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
	description: `Актуальные скидки на автозапчасти и техническое обслуживание в ${CONFIG.STORE_NAME} (${CONFIG.CITY}). Успейте воспользоваться выгодными предложениями на ${CONFIG.DOMAIN}.`,
	keywords: `скидки на автозапчасти ${CONFIG.CITY}, акции ${CONFIG.STORE_NAME}, ТО со скидкой ${CONFIG.CITY}, автосервис ${CONFIG.CITY}, ${CONFIG.DOMAIN}`,
};

// ✅ Типизация возвращаемых данных
async function getPromotions(): Promise<Promotion[]> {
	const res = await fetch("http://localhost:3000/api/promotions", {
		next: { revalidate: 3600 },
	});
	const promotions = await res.json();
	return promotions;
}

export default async function Promotions() {
	const promotions = await getPromotions();

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<h1 className={`pageTitle ${styles.pageTitle}`}>Акции</h1>
				<div className={`screenBlock ${styles.screenBlock}`}>
					{promotions.length === 0 ? (
						<div className={styles.loading}>Загрузка...</div>
					) : (
						promotions.map((promotion) => (
							<div key={promotion.id} className={styles.promotionItem}>
								<div className={styles.photo}>
									<img src={promotion.image} alt={promotion.title} />
								</div>
								<div className={styles.contentBlock}>
									<div className={styles.textContent}>
										<div className={styles.title}>{promotion.title}</div>
										<div className={styles.description}>{promotion.description}</div>
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
