import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import NavigationMenu from "../../../components/navigationMenu/NavigationMenu";
import styles from "../styles.module.scss";
import CONFIG from "@/app/lib/config"; // 🔥 Подключаем конфиг

// ✅ Динамическое создание метаданных
export async function generateMetadata({ params }) {
	const city = CONFIG.CITY; // 🔥 Город из конфига
	const storeName = CONFIG.STORE_NAME;
	const domain = CONFIG.DOMAIN;

	// Получаем данные комплекта ТО (предполагаем, что у нас есть API)
	const response = await fetch(`${domain}/api/service-kits/${params.kitId}`);
	const kit = await response.json();

	if (!kit || kit.error) {
		return {
			title: `Ошибка загрузки комплекта ТО | ${storeName}`,
			description: `Не удалось загрузить информацию о комплекте ТО. Попробуйте позже или свяжитесь с нами на ${domain}.`,
			keywords: `ошибка, комплект ТО, запчасти, автосервис, ${storeName}, ${domain}`,
		};
	}

	return {
		title: `${kit.name} – Комплект ТО в ${storeName} | ${city}`,
		description: `Купить ${kit.name} в ${storeName} (${domain}) по выгодной цене. Включает: ${kit.parts.map((part) => part.name).join(", ")}.`,
		keywords: `${kit.name} ${city}, комплект ТО ${city}, ${kit.parts.map((part) => part.name).join(", ")}, автозапчасти ${city}, автосервис, ${storeName}, ${domain}`,
	};
}

export default function ServiceKit() {
	const { kitId } = useParams();
	const [kit, setKit] = useState(null);

	// Эмуляция запроса к API для получения данных о комплекте ТО
	useEffect(() => {
		// Здесь должен быть fetch(`/api/service-kits/${kitId}`)
		const fetchedKit = {
			name: "Комплект ТО для Hyundai",
			image: "/images/huyndaiKitExample.jpg",
			description: "Фильтры, масло и кольцо масляной пробки для Kia Rio и Hyundai Solaris",
			price: 800,
			parts: [
				{ name: "Масляный фильтр", analogs: ["Bosch", "Mann", "Mahle"] },
				{ name: "Воздушный фильтр", analogs: ["Hengst", "Mahle", "Knecht"] },
				{ name: "Салонный фильтр", analogs: ["Sakura", "Bosch", "Mann"] },
				{ name: "Моторное масло 5W-30", analogs: ["Mobil1", "Castrol", "Shell"] },
			],
		};
		setKit(fetchedKit);
	}, [kitId]);

	if (!kit) return <div>Загрузка...</div>;

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<div className={`screenBlock ${styles.screenBlock}`}>
					<div className={styles.serviceKitDetail}>
						<div className={styles.title}>{kit.name}</div>
						<img src={kit.image} alt={kit.name} className={styles.image} />
						<p className={styles.description}>{kit.description}</p>
						<div className={styles.partsList}>
							<h3>Состав комплекта:</h3>
							<ul>
								{kit.parts.map((part, index) => (
									<li key={index} className={styles.partItem}>
										<div>{part.name}</div>
										<select className={styles.analogSelect}>
											{part.analogs.map((analog, i) => (
												<option key={i} value={analog}>
													{analog}
												</option>
											))}
										</select>
									</li>
								))}
							</ul>
						</div>
						<div className={styles.buttonBlock}>
							<div className={styles.price}>Стоимость: {kit.price} рублей.</div>
							<div className={`button ${styles.button}`}>Добавить в корзину</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
