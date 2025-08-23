// src\app\service-kits\[kitId]\page.tsx

import styles from "../styles.module.scss";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import type { ServiceKit } from "@/lib/types";
import CONFIG from "@/lib/config";

type PageParams = {
	params: Promise<{
		kitId: string;
	}>;
};

// ✅ SSR-метаданные
export async function generateMetadata({ params }: PageParams) {
	const { kitId } = await params;

	try {
		// Проверяем, что мы не в процессе сборки
		if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_BASE_URL) {
			const baseUrl = CONFIG.BASE_URL;
			const res = await fetch(`${baseUrl}/api/service-kits/${kitId}`, {
				cache: "no-store",
			});

			if (res.ok) {
				const kit: ServiceKit = await res.json();
				return {
					title: `${kit.title} – Комплект ТО в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
					description: `Купить ${kit.title} в ${CONFIG.STORE_NAME}. Состав: ${kit.parts?.map((p) => p.name).join(", ")}`,
				};
			}
		}
	} catch (error) {
		console.warn("Ошибка при загрузке метаданных комплекта:", error);
	}

	return {
		title: `Комплект ТО не найден | ${CONFIG.STORE_NAME}`,
	};
}

// ✅ Страница комплекта ТО
export default async function ServiceKitPage({ params }: PageParams) {
	const { kitId } = await params;
	let kit: ServiceKit | null = null;

	try {
		// Проверяем, что мы не в процессе сборки
		if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_BASE_URL) {
			const baseUrl = CONFIG.BASE_URL;
			const res = await fetch(`${baseUrl}/api/service-kits/${kitId}`, {
				cache: "no-store",
			});

			if (res.ok) {
				kit = await res.json();
			}
		}
	} catch (error) {
		console.warn("Ошибка при загрузке комплекта ТО:", error);
	}

	if (!kit) {
		return (
			<div className={`screen ${styles.screen}`}>
				<div className="screenContent">
					<NavigationMenu />
					<div className={`screenBlock ${styles.screenBlock}`}>
						<div className={styles.noKits}>
							<p>Комплект не найден</p>
							<p>Попробуйте обновить страницу позже</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

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
