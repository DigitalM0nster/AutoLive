// src\app\service-kits\[kitId]\page.tsx

import styles from "../styles.module.scss";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import type { ServiceKit } from "@/lib/types";
import CONFIG from "@/lib/config";

type PageParams = {
	params: {
		kitId: string;
	};
};

// ✅ SSR-метаданные
export async function generateMetadata({ params }: PageParams) {
	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/service-kits/${params.kitId}`, {
		cache: "no-store",
	});

	if (!res.ok) {
		return {
			title: `Комплект ТО не найден | ${CONFIG.STORE_NAME}`,
		};
	}

	const kit: ServiceKit = await res.json();

	return {
		title: `${kit.title} – Комплект ТО в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
		description: `Купить ${kit.title} в ${CONFIG.STORE_NAME}. Состав: ${kit.parts?.map((p) => p.name).join(", ")}`,
	};
}

// ✅ Страница комплекта ТО
export default async function ServiceKitPage({ params }: PageParams) {
	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/service-kits/${params.kitId}`, {
		cache: "no-store",
	});

	if (!res.ok) return <div className="screenContent">Комплект не найден</div>;

	const kit: ServiceKit = await res.json();

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
								{kit.parts?.map((part, index) => (
									<li key={index} className={styles.partItem}>
										<div>{part.name}</div>
										<select className={styles.analogSelect}>
											{part.analogs.map((analog, i) => (
												<option key={i} value={typeof analog === "string" ? analog : analog.title}>
													{typeof analog === "string" ? analog : analog.title}
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
