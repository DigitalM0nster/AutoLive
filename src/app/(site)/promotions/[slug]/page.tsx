import Link from "next/link";
import { notFound } from "next/navigation";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import styles from "../styles.module.scss";
import CONFIG from "@/lib/config";
import { slugify } from "@/lib/slugify";
import { formatPromotionPeriod } from "@/lib/promotionDisplay";
import { parsePromotionButtons } from "@/lib/promotionButtons";
import type { Promotion } from "@/lib/types";
import { getInternalApiBaseUrl } from "@/lib/internalApiBaseUrl";
import PromotionDetailActions from "../local_components/PromotionDetailActions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
	const { slug } = await params;
	const baseUrl = await getInternalApiBaseUrl();
	const res = await fetch(`${baseUrl}/api/promotions`, { next: { revalidate: 3600 } });
	if (!res.ok) return { title: "Акция" };
	const promotions: Promotion[] = await res.json();
	const promotion = promotions.find((p) => slugify(p.title) === slug);
	if (!promotion) return { title: "Акция" };
	return {
		title: `${promotion.title} | Акции ${CONFIG.STORE_NAME} | ${CONFIG.CITY}`,
		description: promotion.description?.slice(0, 160) || `Акция: ${promotion.title}`,
	};
}

export default async function PromotionPage({ params }: Props) {
	const { slug } = await params;
	const baseUrl = await getInternalApiBaseUrl();
	const res = await fetch(`${baseUrl}/api/promotions`, {
		next: { revalidate: 3600 },
	});

	if (!res.ok) {
		return (
			<div className="screen">
				<div className="screenContent">
					<NavigationMenu />
					<div className="emptyState">Не удалось загрузить акцию. Попробуйте обновить страницу.</div>
				</div>
			</div>
		);
	}

	const promotions: Promotion[] = await res.json();
	const promotion = promotions.find((p) => slugify(p.title) === slug);

	if (!promotion) {
		notFound();
	}

	const period = formatPromotionPeriod(promotion.startDate, promotion.endDate);
	const buttons = parsePromotionButtons(promotion.buttonsJson);

	return (
		<div className="screen">
			<div className="screenContent">
				<NavigationMenu />

				<Link href="/promotions" className={styles.backLink}>
					Все акции
				</Link>

				<header className={styles.pageHeader}>
					<h1 className="pageTitle">{promotion.title}</h1>
					{period && <p className="pageLead">{period}</p>}
				</header>

				<article className={styles.promotionDetail}>
					<div className={styles.detailHero}>
						{promotion.image ? (
							<img src={promotion.image} alt={promotion.title} />
						) : (
							<img src="/images/no-image.png" alt="" />
						)}
						<div className={styles.detailHeroOverlay} aria-hidden="true" />
					</div>

					{(promotion.description || buttons.length > 0) && (
						<div className={styles.detailContent}>
							{promotion.description && <div className={styles.detailDescription}>{promotion.description}</div>}

							{buttons.length > 0 && (
								<PromotionDetailActions
									promotionId={promotion.id}
									promotionTitle={promotion.title}
									buttonsJson={promotion.buttonsJson}
								/>
							)}
						</div>
					)}
				</article>
			</div>
		</div>
	);
}
