// src\app\service-kits\page.tsx

import styles from "./styles.module.scss";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import Link from "next/link";
import CONFIG from "@/lib/config";
import { getServiceKits } from "@/lib/api";

export async function generateMetadata() {
	const { CITY, STORE_NAME, DOMAIN } = CONFIG;
	return {
		title: `Комплекты ТО в ${STORE_NAME} | ${CITY}`,
		description: `Выберите и закажите комплекты ТО в ${STORE_NAME} (${DOMAIN}). Полный ассортимент расходников для автомобилей в ${CITY}.`,
		keywords: `комплекты ТО ${CITY}, техническое обслуживание ${CITY}, автозапчасти ${CITY}, сервис ${CITY}, ${STORE_NAME}, ${DOMAIN}`,
	};
}

export default async function ServiceKitsPage() {
	const kits = await getServiceKits();

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<h1 className={`pageTitle ${styles.pageTitle}`}>Комплекты ТО</h1>
				<div className={`screenBlock ${styles.screenBlock}`}>
					{kits.map((kit) => (
						<div key={kit.id} className={styles.serviceKitItem}>
							<div className={styles.imageBlock}>
								<img src={kit.image} alt={kit.name} />
							</div>
							<div className={styles.contentBlock}>
								<div className={styles.titleBlock}>
									<div className={styles.title}>{kit.name}</div>
									<div className={styles.description}>
										<p>{kit.description}</p>
									</div>
								</div>
								<div className={styles.buttonBlock}>
									<div className={styles.price}>Стоимость: {kit.price} рублей.</div>
									<Link href={`/service-kits/${kit.id}`} className={`button ${styles.button}`}>
										Выбрать
									</Link>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
