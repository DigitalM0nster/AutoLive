import Link from "next/link";
import styles from "./PromotionCard.module.scss";

type PromotionCardProps = {
	href: string;
	title: string;
	description?: string | null;
	image?: string | null;
	period?: string | null;
	featured?: boolean;
};

export default function PromotionCard({ href, title, description, image, period, featured = false }: PromotionCardProps) {
	const excerpt = description?.trim() || "";

	return (
		<Link href={href} className={styles.cardLink}>
			<article className={[styles.card, featured ? styles.cardFeatured : ""].filter(Boolean).join(" ")}>
				<div className={styles.media}>
					<img src={image || "/images/no-image.png"} alt="" />
					<div className={styles.mediaOverlay} aria-hidden="true" />
					{period && <span className={styles.period}>{period}</span>}
				</div>

				<div className={styles.body}>
					<h2 className={styles.title}>{title}</h2>
					{excerpt && <p className={styles.description}>{excerpt}</p>}

					<span className={styles.action}>
						Подробнее
						<span className={styles.actionArrow} aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
								<path d="M9 7H17V15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</span>
					</span>
				</div>
			</article>
		</Link>
	);
}
