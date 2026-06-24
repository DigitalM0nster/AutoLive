import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import PromotionsHeroBanner, { type PromotionBannerSlide } from "./local_components/PromotionsHeroBanner";
import styles from "./styles.module.scss";
import CONFIG from "@/lib/config";
import { formatPromotionPeriod } from "@/lib/promotionDisplay";
import { resolvePromotionImageSrc } from "@/lib/promotionImage";
import { parsePromotionButtons } from "@/lib/promotionButtons";
import type { Promotion } from "@/lib/types";
import { getInternalApiBaseUrl } from "@/lib/internalApiBaseUrl";
import type { HomepageContentData } from "@/app/api/homepage-content/route";

export const dynamic = "force-dynamic";

export const metadata = {
	title: `Скидки и акции в ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
	description: `Актуальные скидки на автозапчасти и техническое обслуживание в ${CONFIG.STORE_NAME} (${CONFIG.CITY}). Успейте воспользоваться выгодными предложениями на ${CONFIG.DOMAIN}.`,
	keywords: `скидки на автозапчасти ${CONFIG.CITY}, акции ${CONFIG.STORE_NAME}, ТО со скидкой ${CONFIG.CITY}, автосервис ${CONFIG.CITY}, ${CONFIG.DOMAIN}`,
};

function mapPromotionToSlide(promotion: Promotion, formData?: HomepageContentData): PromotionBannerSlide {
	return {
		id: promotion.id,
		title: promotion.title,
		description: promotion.description,
		image: resolvePromotionImageSrc(promotion.image),
		period: formatPromotionPeriod(promotion.startDate, promotion.endDate),
		buttons: parsePromotionButtons(promotion.buttonsJson),
		formData,
	};
}

export default async function Promotions() {
	const baseUrl = await getInternalApiBaseUrl();
	const [res, homepageRes] = await Promise.all([
		fetch(`${baseUrl}/api/promotions`, { next: { revalidate: 3600 } }),
		fetch(`${baseUrl}/api/homepage-content`, { next: { revalidate: 3600 } }),
	]);

	if (!res.ok) {
		console.error(`Ошибка API: ${res.status} ${res.statusText}`);
		return (
			<div className="screen">
				<div className="screenContent">
					<NavigationMenu />
					<h1 className="pageTitle">Акции</h1>
					<div className="emptyState">Не удалось загрузить акции. Попробуйте обновить страницу.</div>
				</div>
			</div>
		);
	}

	const promotions: Promotion[] = await res.json();
	const formData: HomepageContentData | undefined = homepageRes.ok ? await homepageRes.json() : undefined;
	const bannerSlides = promotions.map((promotion) => mapPromotionToSlide(promotion, formData));

	return (
		<div className="screen">
			<div className="screenContent">
				<NavigationMenu />

				<header className={styles.pageHeader}>
					<h1 className="pageTitle">Акции</h1>
				</header>

				{promotions.length === 0 ? (
					<div className="emptyState">Акций пока нет — загляните позже.</div>
				) : (
					<div className={styles.promotionsLayout}>
						<PromotionsHeroBanner slides={bannerSlides} />
					</div>
				)}
			</div>
		</div>
	);
}
