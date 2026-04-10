import Link from "next/link";
import { notFound } from "next/navigation";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import styles from "../styles.module.scss";
import CONFIG from "@/lib/config";
import { slugify } from "@/lib/slugify";
import type { Promotion } from "@/lib/types";
import { getInternalApiBaseUrl } from "@/lib/internalApiBaseUrl";

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
		return <div className="text-center">Ошибка загрузки</div>;
	}

	const promotions: Promotion[] = await res.json();
	const promotion = promotions.find((p) => slugify(p.title) === slug);

	if (!promotion) {
		notFound();
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<nav className={styles.breadcrumb}>
					<Link href="/promotions">Акции</Link>
					<span className={styles.breadcrumbSep}> / </span>
					<span>{promotion.title}</span>
				</nav>
				<h1 className={`pageTitle ${styles.pageTitle}`}>{promotion.title}</h1>

				<div className={`screenBlock ${styles.screenBlock}`}>
					<div className={styles.promotionItem}>
						<div className={styles.photo}>
							{promotion.image ? (
								<img src={promotion.image} alt={promotion.title} />
							) : (
								<img src="/images/no-image.png" alt="" />
							)}
						</div>
						<div className={styles.contentBlock}>
							<div className={styles.textContent}>
								{promotion.description && (
									<div className={styles.description}>{promotion.description}</div>
								)}
							</div>
							{(promotion.buttonLink || promotion.buttonText) && (
								<Link href={promotion.buttonLink || "#"} className={`button ${styles.button}`}>
									{promotion.buttonText || "Подробнее"}
								</Link>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
