// src\app\service-kits\page.tsx

import styles from "./styles.module.scss";

// Не статически генерируем при build — страница запрашивает API при каждом запросе (для Vercel и локального build)
export const dynamic = "force-dynamic";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import Link from "next/link";
import CONFIG from "@/lib/config";
import type { ServiceKit } from "@/lib/types";

export async function generateMetadata() {
	const { CITY, STORE_NAME, DOMAIN } = CONFIG;
	return {
		title: `Комплекты ТО в ${STORE_NAME} | ${CITY}`,
		description: `Выберите и закажите комплекты ТО в ${STORE_NAME} (${DOMAIN}). Полный ассортимент расходников для автомобилей в ${CITY}.`,
		keywords: `комплекты ТО ${CITY}, техническое обслуживание ${CITY}, автозапчасти ${CITY}, сервис ${CITY}, ${STORE_NAME}, ${DOMAIN}`,
	};
}

export default async function ServiceKitsPage() {
	let kits: ServiceKit[] = [];

	// Проверяем, что мы не в процессе сборки
	// Во время сборки (build time) мы не должны делать API вызовы
	if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
		// Мы в процессе сборки, не делаем API вызовы
		console.log("Сборка в процессе, пропускаем API вызовы");
	} else {
		try {
			const baseUrl = CONFIG.BASE_URL;
			const res = await fetch(`${baseUrl}/api/get-kits`, {
				next: { revalidate: 3600 },
			});

			if (res.ok) {
				kits = await res.json();
			} else {
				console.warn("Не удалось загрузить комплекты ТО:", res.status);
			}
		} catch (error) {
			console.warn("Ошибка при загрузке комплектов ТО:", error);
			// В случае ошибки продолжаем работу с пустым массивом
		}
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<h1 className={`pageTitle ${styles.pageTitle}`}>Комплекты ТО</h1>
				<div className={`screenBlock ${styles.screenBlock}`}>
					{kits.length > 0 ? (
						kits.map((kit) => (
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
						))
					) : (
						<div className={styles.noKits}>
							<p>Комплекты ТО временно недоступны</p>
							<p>Попробуйте обновить страницу позже</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
