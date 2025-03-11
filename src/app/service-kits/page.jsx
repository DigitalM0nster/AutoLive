import styles from "./styles.module.scss";
import NavigationMenu from "@/components/navigationMenu/NavigationMenu";
import Link from "next/link";
import CONFIG from "@/app/lib/config"; // 🔥 Подключаем конфиг

// ✅ Динамическое создание метаданных
export async function generateMetadata() {
	const city = CONFIG.CITY; // 🔥 Город из конфига
	const storeName = CONFIG.STORE_NAME;
	const domain = CONFIG.DOMAIN;

	return {
		title: `Комплекты ТО в ${storeName} | ${city}`,
		description: `Выберите и закажите комплекты ТО в ${storeName} (${domain}). Полный ассортимент расходников для автомобилей в ${city}.`,
		keywords: `комплекты ТО ${city}, техническое обслуживание ${city}, автозапчасти ${city}, запчасти для ТО ${city}, сервис ${city}, ${storeName}, ${domain}`,
	};
}

export default async function ServiceKits() {
	// Загружаем данные **один раз на билде, но обновляем раз в 1 час**
	async function getKits() {
		const res = await fetch("http://localhost:3000/api/get-kits", {
			next: { revalidate: 3600 }, // Обновление раз в 1 час
		});
		const kits = await res.json();
		return kits;
	}

	const kits = await getKits();

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<h1 className={`pageTitle ${styles.pageTitle}`}>Комплекты ТО</h1>
				<div className={`screenBlock ${styles.screenBlock}`}>
					{kits.map((kit) => (
						<div key={kit.id} className={styles.serviceKitItem}>
							<div className={`${styles.imageBlock}`}>
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
