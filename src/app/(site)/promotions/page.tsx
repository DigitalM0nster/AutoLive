import Link from "next/link";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import styles from "./styles.module.scss";
import CONFIG from "@/lib/config";
import type { Promotion } from "@/lib/types";

// Не статически генерируем при build — страница запрашивает API при каждом запросе (для Vercel и локального build)
export const dynamic = "force-dynamic";

export const metadata = {
	title: `Скидки и акции в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
	description: `Актуальные скидки на автозапчасти и техническое обслуживание в ${CONFIG.STORE_NAME} (${CONFIG.CITY}). Успейте воспользоваться выгодными предложениями на ${CONFIG.DOMAIN}.`,
	keywords: `скидки на автозапчасти ${CONFIG.CITY}, акции ${CONFIG.STORE_NAME}, ТО со скидкой ${CONFIG.CITY}, автосервис ${CONFIG.CITY}, ${CONFIG.DOMAIN}`,
};

export default async function Promotions() {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
	const res = await fetch(`${baseUrl}/api/promotions`, {
		next: { revalidate: 3600 },
	});

	if (!res.ok) {
		console.error(`Ошибка API: ${res.status} ${res.statusText}`);
		return <div className="text-center">Ошибка загрузки акций</div>;
	}

	const promotions: Promotion[] = await res.json();

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
									{promotion.image ? <img src={promotion.image} alt={promotion.title} /> : <img src="/images/no-image.png" alt="" />}
								</div>
								<div className={styles.contentBlock}>
									<div className={styles.textContent}>
										<div className={styles.title}>{promotion.title}</div>
										<div className={styles.description}>{promotion.description}</div>
									</div>
									{(promotion.buttonLink || promotion.buttonText) && (
										<Link href={promotion.buttonLink || ""} className={`button ${styles.button}`}>
											{promotion.buttonText || "Подробнее"}
										</Link>
									)}
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
