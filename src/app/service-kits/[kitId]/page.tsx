// src\app\service-kits\[kitId]\page.tsx

import styles from "../styles.module.scss";
import NavigationMenu from "@/components/navigationMenu/NavigationMenu";
import { getServiceKitById } from "@/lib/api";
import type { ServiceKit } from "@/lib/types";
import CONFIG from "@/lib/config";

type PageParams = {
	params: {
		kitId: string;
	};
};

// ✅ SSR-метаданные
export async function generateMetadata({ params }: PageParams) {
	const kit = await getServiceKitById(params.kitId);

	if (!kit) {
		return {
			title: `Комплект ТО не найден | ${CONFIG.STORE_NAME}`,
		};
	}

	return {
		title: `${kit.name} – Комплект ТО в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
		description: `Купить ${kit.name} в ${CONFIG.STORE_NAME}. Состав: ${kit.parts.map((p) => p.name).join(", ")}`,
	};
}

// ✅ Страница комплекта ТО
export default async function ServiceKitPage({ params }: PageParams) {
	const kit: ServiceKit | null = await getServiceKitById(params.kitId);

	if (!kit) return <div className="screenContent">Комплект не найден</div>;

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
							<div className={styles.price}>Стоимость: {kit.price} ₽</div>
							<div className={`button ${styles.button}`}>Добавить в корзину</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
